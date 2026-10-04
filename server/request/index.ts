/**
 HTTP-вход Wazy MCP: GET /tools и POST /tools с {node, action, input}.
 @remarks Без версии URL и без собственного MCP runtime. Описание инструмента
 не выполняет его. Все операции, включая чтение каталога, требуют Bearer token.
 @packageDocumentation
 */
import {randomUUID, timingSafeEqual} from "node:crypto"
import ToolError from "@tech/failure"
import validation from "@tech/input"
const {object, text} = validation
import createDiscovery from "@server/discovery"
import {bindings} from "./src/bindings.ts"
import {readBody} from "./src/body.ts"

import type {ServerRequest} from "./contract/index.ts"
export type {ServerRequest} from "./contract/index.ts"

/**
Связывает проверенный токен и назначенную область с явным набором HTTP-действий.

@param options - Контекст исполнения, trusted каталог исходников и безопасный logger хоста.

@returns Обработчик запросов с нормализацией ошибок; создание не запускает listener.

@throws ToolError при длине токена вне 32–256 символов либо ошибке структуры каталога.
*/
export default function createRequestHandler(options: ServerRequest.Input): ServerRequest.Output {
  const token = text(options.token, "token")
  if (token.length < 32 || token.length > 256) throw new ToolError("INVALID_INPUT", "Token must contain 32 to 256 characters")
  const expected = Buffer.from(`Bearer ${token}`)
  const handlers = bindings(options.workspace)
  const discovery = createDiscovery({repositoryRoot: options.repositoryRoot, runnable: new Set(handlers.keys())})
  return {handle: async request => {
    const requestId = randomUUID()
    const started = performance.now()
    let node: string | undefined
    let action: string | undefined
    let status = 200
    let errorCode: string | undefined
    let data: unknown
    try {
      const provided = Buffer.from(request.headers.get("authorization") ?? "")
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new ToolError("UNAUTHORIZED", "A valid Bearer token is required", 401)
      if (request.headers.has("origin")) throw new ToolError("ORIGIN_NOT_ALLOWED", "Browser-origin requests are not enabled", 403)
      const url = new URL(request.url)
      if (url.pathname !== "/tools") throw new ToolError("NOT_FOUND", "Unknown endpoint", 404)
      if (url.search !== "") throw new ToolError("INVALID_INPUT", "Use the JSON request body, not URL query parameters")
      if (request.method !== "GET" && request.method !== "POST") throw new ToolError("METHOD_NOT_ALLOWED", "Use GET or POST", 405)
      const payload = request.method === "GET" ? {} : await readBody(request)
      object(payload, ["node", "action", "input"])
      const body = payload as {node?: unknown; action?: unknown; input?: unknown}
      node = body.node === undefined ? undefined : text(body.node, "node")
      action = body.action === undefined ? undefined : text(body.action, "action")
      if (action === undefined) {
        const viewInput = body.input ?? {}
        object(viewInput, ["view"])
        const view = (viewInput as {view?: unknown}).view
        data = discovery.describe(node, view === undefined ? undefined : text(view, "view"))
      } else {
        if (action !== "run") throw new ToolError("ACTION_NOT_ALLOWED", "Only action: run executes tools")
        if (node === undefined || !discovery.has(node)) throw new ToolError("UNKNOWN_NODE", "Unknown executable node", 404)
        const handler = handlers.get(node)
        if (handler === undefined) throw new ToolError("ACTION_NOT_ALLOWED", "This structural node is not executable", 403)
        data = await handler(body.input ?? {})
      }
    } catch (error) {
      const failure = ToolError.from(error)
      status = failure.status
      errorCode = failure.code
      data = {error: {code: failure.code, message: failure.message, ...(failure.details === undefined ? {} : {details: failure.details})}, requestId}
    }
    const headers: Record<string, string> = {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-request-id": requestId}
    if (status === 401) headers["www-authenticate"] = "Bearer"
    if (status === 405) headers["allow"] = "GET, POST"
    try { options.logger?.({requestId, method: request.method, node, action, status, durationMs: Math.round(performance.now() - started), errorCode}) }
    catch { /* Diagnostics must not change an already completed operation. */ }
    return new Response(JSON.stringify(data), {status, headers})
  }}
}
