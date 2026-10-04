import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import createRequestHandler from "@server/request"
import testing from "@ai/testing"
import {get, post, token} from "./fixture.ts"

const {fixture, hasCode, createFixture} = testing

async function expectError(response: Response, status: number, code: string): Promise<void> {
  const body = await response.json() as {error: {code: string; message: string; details?: unknown}}
  expect(response.status, "HTTP-статус различает причину отказа").toBe(status)
  expect(Object.keys(body), "Отказ содержит только error, без requestId в JSON").toEqual(["error"])
  expect(body.error.code, "Код ошибки передаёт машинную причину отказа").toBe(code)
  expect(typeof body.error.message, "Текст ошибки присутствует в разрешённой части ответа").toBe("string")
  expect(Object.keys(body.error).sort(), "Ошибка содержит code и message; details добавляются только для применимой ошибки").toEqual(body.error.details === undefined ? ["code", "message"] : ["code", "details", "message"])
  expect(response.headers.get("x-request-id"), "Идентификатор запроса остаётся в транспортном заголовке").toBeString()
}

describe("Авторизация", () => {
  test("Каталог требует Bearer token", () => fixture(async workspace => {
    const app = createRequestHandler({workspace, token})
    const response = await app.handle(new Request("http://localhost/tools"))
    await expectError(response, 401, "UNAUTHORIZED")
    expect(response.headers.get("www-authenticate"), "Отказ предлагает Bearer-аутентификацию").toBe("Bearer")
  }))

  test("Слабый токен отклоняется до обработки запроса", () => fixture(workspace => {
    assert.throws(() => createRequestHandler({workspace, token: "short"}), hasCode("INVALID_INPUT"), "Короткий токен не создаёт обработчик")
  }))
})

describe.each([
  {name: "Пустой POST", body: {}},
  {name: "Прежняя оболочка read", body: {node: "ai/filesystem/read", action: "run", input: {path: "file"}}},
  {name: "Прежняя оболочка write", body: {node: "ai/filesystem/write", action: "run", input: {path: "file", content: "bad"}}},
  {name: "Параметр view", body: {name: "filesystem.read", arguments: {path: "file"}, view: "contract"}},
  {name: "Параметр root", body: {name: "filesystem.read", arguments: {path: "file"}, root: "other"}},
  {name: "Параметр entity", body: {name: "filesystem.read", arguments: {path: "file"}, entity: "read"}},
  {name: "Параметр requestId", body: {name: "filesystem.read", arguments: {path: "file"}, requestId: "model-generated"}},
  {name: "Параметр id", body: {name: "filesystem.read", arguments: {path: "file"}, id: "model-generated"}},
  {name: "Параметр ids", body: {name: "filesystem.read", arguments: {path: "file"}, ids: []}},
  {name: "Неоговорённое поле", body: {name: "filesystem.read", arguments: {path: "file"}, extra: true}},
  {name: "Отсутствуют arguments", body: {name: "filesystem.list"}},
  {name: "Arguments как массив", body: {name: "filesystem.list", arguments: []}},
  {name: "Arguments как null", body: {name: "filesystem.list", arguments: null}},
  {name: "Массив вместо оболочки", body: []},
])("Недопустимая оболочка: $name", ({body}) => {
  test("Отказ до побочного эффекта", () => fixture(async (workspace, root) => {
    writeFileSync(join(root, "file"), "before")
    const app = createRequestHandler({workspace, token})
    await expectError(await app.handle(post(body)), 400, "INVALID_INPUT")
    expect(readFileSync(join(root, "file"), "utf8"), "Отвергнутая оболочка не запускает прежнюю запись").toBe("before")
  }))
})

describe.each([
  {name: "неизвестный", tool: "filesystem.unknown"},
  {name: "технический request", tool: "server.request"},
  {name: "технический access", tool: "filesystem.access"},
  {name: "произвольный импорт", tool: "../../etc/passwd"},
])("Недоступное имя: $name", ({tool}) => {
  test("Единый отказ UNKNOWN_TOOL", () => fixture(async workspace => {
    const app = createRequestHandler({workspace, token})
    await expectError(await app.handle(post({name: tool, arguments: {}})), 404, "UNKNOWN_TOOL")
  }))
})

describe("Аргументы и файловые ошибки", () => {
  test("Подставленный root отклоняется до записи в любой контекст", async () => {
    const a = createFixture()
    const b = createFixture()
    try {
      writeFileSync(join(a.root, "file"), "A")
      writeFileSync(join(b.root, "file"), "B")
      const app = createRequestHandler({workspace: a.context, token})
      await expectError(await app.handle(post({name: "filesystem.write", arguments: {root: b.root, path: "file", content: "bad"}})), 400, "INVALID_INPUT")
      expect(readFileSync(join(a.root, "file"), "utf8"), "Назначенный файл не изменён после отклонения root").toBe("A")
      expect(readFileSync(join(b.root, "file"), "utf8"), "Внешняя область не затронута подставленным root").toBe("B")
    } finally {
      a.close()
      b.close()
    }
  })

  test("Отсутствие пути, конфликт и traversal имеют разные статусы", () => fixture(async (workspace, root) => {
    writeFileSync(join(root, "existing"), "old")
    const app = createRequestHandler({workspace, token})
    await expectError(await app.handle(post({name: "filesystem.read", arguments: {path: "missing"}})), 404, "NOT_FOUND")
    await expectError(await app.handle(post({name: "filesystem.create", arguments: {path: "existing", content: "new"}})), 409, "CONFLICT")
    await expectError(await app.handle(post({name: "filesystem.read", arguments: {path: "../private"}})), 403, "PATH_NOT_ALLOWED")
    expect(readFileSync(join(root, "existing"), "utf8"), "Отказы не меняют существующий файл").toBe("old")
  }))

  test("Некорректное имя инструмента не создаёт файл", () => fixture(async (workspace, root) => {
    const app = createRequestHandler({workspace, token})
    await expectError(await app.handle(post({name: "filesystem.missing", arguments: {path: "new", content: "x"}})), 404, "UNKNOWN_TOOL")
    expect(existsSync(join(root, "new")), "Неизвестное имя не выполняет запись").toBeFalse()
  }))
})

describe("Границы HTTP", () => {
  test("Метод, media type, Origin и адрес отклоняются", () => fixture(async workspace => {
    const app = createRequestHandler({workspace, token})
    await expectError(await app.handle(new Request("http://localhost/tools", {method: "DELETE", headers: {authorization: `Bearer ${token}`}})), 405, "METHOD_NOT_ALLOWED")
    await expectError(await app.handle(post({name: "filesystem.list", arguments: {}}, {"content-type": "text/plain"})), 415, "UNSUPPORTED_MEDIA_TYPE")
    await expectError(await app.handle(post({name: "filesystem.list", arguments: {}}, {origin: "https://untrusted.invalid"})), 403, "ORIGIN_NOT_ALLOWED")
    await expectError(await app.handle(new Request("http://localhost/v1/tools", {headers: {authorization: `Bearer ${token}`}})), 404, "NOT_FOUND")
  }))

  test("Некорректный JSON и превышение 12 MiB отклоняются", () => fixture(async workspace => {
    const app = createRequestHandler({workspace, token})
    const invalid = new Request("http://localhost/tools", {method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"}, body: "{"})
    await expectError(await app.handle(invalid), 400, "INVALID_INPUT")
    await expectError(await app.handle(post({name: "filesystem.list", arguments: {}}, {"content-length": "13000000"})), 413, "LIMIT_EXCEEDED")
    const large = new Request("http://localhost/tools", {method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"}, body: "x".repeat(12 * 1024 * 1024 + 1)})
    await expectError(await app.handle(large), 413, "LIMIT_EXCEEDED")
  }))
})

test("PARTIAL_FAILURE сохраняет details завершённой операции в новой оболочке", () => fixture(async (workspace, root) => {
  const app = createRequestHandler({workspace, token})
  const response = await app.handle(post({
    name: "filesystem.apply-patch",
    arguments: {patch: "*** Begin Patch\n*** Add File: parent\n+file\n*** Add File: parent/child\n+child\n*** End Patch"},
  }))
  const body = await response.json()
  expect(response.status, "Частичный отказ IO не выдаётся за успешный результат").toBe(500)
  expect(Object.keys(body), "Ошибка не смешивается с result или requestId").toEqual(["error"])
  expect(body.error, "Подробности позволяют сверить уже выполненное действие перед дальнейшим решением").toMatchObject({
    code: "PARTIAL_FAILURE",
    details: {
      completed: [{operation: "add", path: "parent", bytes: 5}],
      current: {operation: "add", path: "parent/child", bytes: 6},
    },
  })
  expect(readFileSync(join(root, "parent"), "utf8"), "Первый эффект сохранён и соответствует details.completed").toBe("file\n")
}))
