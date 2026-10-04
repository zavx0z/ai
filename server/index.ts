/**
 Запускает независимый HTTP-host именованных инструментов.
 @remarks По умолчанию слушает только loopback. Не импортирует Interpreter UI,
 Storybook runtime, CDP или отдельный MCP-server.
 @packageDocumentation
 */
import {createServer} from "node:http"
import {Readable} from "node:stream"
import {fileURLToPath} from "node:url"
import {resolve} from "node:path"
import type {AddressInfo} from "node:net"
import createWorkspace from "@zavx0z/ai-workspace"
import validation from "@zavx0z/ai-tech-input"
const {integer, text, boolean} = validation
import createRequestHandler from "@zavx0z/ai-server-request"

import type {AiServer} from "./contract/index.ts"
export type {AiServer} from "./contract/index.ts"

/**
Назначает область и запускает HTTP-listener, связанный с подготовленными инструментами.

@param options - Доверенная конфигурация области, токена и адреса прослушивания.

@returns Фактический URL и освобождение listener после завершения запросов.

@throws Ошибка конфигурации до listen либо ошибка ОС при запуске сервера.
*/
export default async function startServer(options: AiServer.Input): Promise<AiServer.Output> {
  const workspace = createWorkspace({directory: options.directory})
  const hostname = text(options.hostname ?? "127.0.0.1", "hostname")
  const port = integer(options.port, 8787, 0, 65535, "port")
  const log = boolean(options.log, true, "log")
  const handler = createRequestHandler({workspace, token: options.token,
    logger: log ? event => process.stderr.write(JSON.stringify(event) + "\n") : undefined})
  const server = createServer(async (incoming, outgoing) => {
    try {
      const method = incoming.method ?? "GET"
      const headers = new Headers()
      for (const [name, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value)
      const init: RequestInit & {duplex?: "half"} = {method, headers}
      if (method !== "GET" && method !== "HEAD") {
        init.body = Readable.toWeb(incoming) as unknown as ReadableStream<Uint8Array>
        init.duplex = "half"
      }
      const response = await handler.handle(new Request(`http://localhost${incoming.url ?? "/"}`, init))
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      outgoing.end(Buffer.from(await response.arrayBuffer()))
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(400, {"content-type": "application/json", "cache-control": "no-store"})
      outgoing.end(JSON.stringify({error: {code: "INVALID_REQUEST", message: "Could not process HTTP request"}}))
    }
  })
  await new Promise<void>((done, reject) => {
    server.once("error", reject)
    server.listen(port, hostname, () => {
      server.off("error", reject)
      done()
    })
  })
  const address = server.address() as AddressInfo
  const host = address.family === "IPv6" ? `[${address.address}]` : address.address
  return {url: `http://${host}:${address.port}/tools`, close: () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))}
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = process.env["AI_TOOLS_DIRECTORY"] ?? ""
    const host = await startServer({directory, token: process.env["AI_TOOLS_TOKEN"] ?? "",
      hostname: process.env["AI_TOOLS_HOST"], port: process.env["AI_TOOLS_PORT"] === undefined ? undefined : Number(process.env["AI_TOOLS_PORT"])})
    process.stderr.write(`AI tools listening at ${host.url}\n`)
    /**
    Завершает принадлежащий CLI listener по сигналу процесса, отмечая ошибку закрытия кодом выхода.
    */
    const stop = (): void => { void host.close().catch(() => {process.exitCode = 1}) }
    process.once("SIGINT", stop)
    process.once("SIGTERM", stop)
  } catch (error) {
    process.stderr.write(`Unable to start AI tools: ${error instanceof Error ? error.message : "invalid configuration"}\n`)
    process.exitCode = 1
  }
}
