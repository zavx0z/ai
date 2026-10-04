/**
Исполняет команды инструментов в назначенной хостом области через HTTP.
GET /tools раскрывает описания доступных операций; POST /tools выполняет
ровно одну команду {name, arguments}. Оба входа требуют Bearer-токен.

@packageDocumentation
*/
import {randomUUID, timingSafeEqual} from "node:crypto"
import ToolError from "@ai-tech/failure"
import validation from "@ai-tech/input"
const {object, text} = validation
import descriptions from "./src/descriptions.json" with {type: "json"}
import {bindings} from "./src/bindings.ts"
import {readBody} from "./src/body.ts"

import type {Command, Reply} from "./src/messages.ts"
import type {AiServerRequest} from "./contract/index.ts"
export type {AiServerRequest} from "./contract/index.ts"

/**
Связывает токен и область хоста с исполнением именованных команд инструментов.

@param options - Контекст исполнения, Bearer-токен и безопасный logger хоста.

@returns Обработчик запросов с нормализацией ошибок; создание не запускает listener.

@throws ToolError при длине токена вне 32–256 символов либо рассогласовании подготовленных описаний и исполнителей.
*/
export default function createRequestHandler(options: AiServerRequest.Input): AiServerRequest.Output {
  const token = text(options.token, "token")
  if (token.length < 32 || token.length > 256) throw new ToolError("INVALID_INPUT", "Token must contain 32 to 256 characters")
  const expected = Buffer.from(`Bearer ${token}`)
  const handlers = bindings(options.workspace)
  if (descriptions.length !== handlers.size || new Set(descriptions.map(tool => tool.name)).size !== handlers.size
    || descriptions.some(tool => !handlers.has(tool.name))) {
    throw new ToolError("INVALID_CONFIGURATION", "Tool descriptions do not match executable bindings", 500)
  }
  return {handle: async request => {
    const requestId = randomUUID()
    const started = performance.now()
    let name: string | undefined
    let status = 200
    let errorCode: string | undefined
    let data: Reply
    try {
      const provided = Buffer.from(request.headers.get("authorization") ?? "")
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new ToolError("UNAUTHORIZED", "A valid Bearer token is required", 401)
      if (request.headers.has("origin")) throw new ToolError("ORIGIN_NOT_ALLOWED", "Browser-origin requests are not enabled", 403)
      const url = new URL(request.url)
      if (url.pathname !== "/tools") throw new ToolError("NOT_FOUND", "Unknown endpoint", 404)
      if (url.search !== "") throw new ToolError("INVALID_INPUT", "Use the JSON request body, not URL query parameters")
      if (request.method !== "GET" && request.method !== "POST") throw new ToolError("METHOD_NOT_ALLOWED", "Use GET or POST", 405)
      if (request.method === "GET") {
        data = {result: descriptions}
      } else {
        const payload = await readBody(request)
        object(payload, ["name", "arguments"])
        const command = payload as Partial<Command>
        name = text(command.name, "name")
        if (name.length > 128) throw new ToolError("INVALID_INPUT", "Tool name exceeds 128 characters")
        if (command.arguments === null || typeof command.arguments !== "object" || Array.isArray(command.arguments)) {
          throw new ToolError("INVALID_INPUT", "arguments must be an object")
        }
        const execute = handlers.get(name)
        if (execute === undefined) throw new ToolError("UNKNOWN_TOOL", "Unknown executable tool", 404)
        data = {result: await execute(command.arguments)}
      }
    } catch (error) {
      const failure = ToolError.from(error)
      status = failure.status
      errorCode = failure.code
      data = {error: {code: failure.code, message: failure.message, ...(failure.details === undefined ? {} : {details: failure.details})}}
    }
    const headers: Record<string, string> = {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-request-id": requestId}
    if (status === 401) headers["www-authenticate"] = "Bearer"
    if (status === 405) headers["allow"] = "GET, POST"
    try { options.logger?.({requestId, method: request.method, name, status, durationMs: Math.round(performance.now() - started), errorCode}) }
    catch { /* Диагностика не меняет результат уже завершённой операции. */ }
    return new Response(JSON.stringify(data), {status, headers})
  }}
}
