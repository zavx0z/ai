import {describe, expect, test} from "bun:test"
import {readFileSync} from "node:fs"
import {join} from "node:path"
import createRequestHandler from "@ai-server/request"
import testing from "@ai/testing"
import {post, token} from "./fixture.ts"

const {fixture} = testing

describe("Диагностика HTTP", () => {
  test("Лог содержит метаданные, но не аргументы или токен", () => fixture(async (workspace, root) => {
    const logs: unknown[] = []
    const app = createRequestHandler({workspace, token, logger: event => logs.push(event)})
    const response = await app.handle(post({name: "filesystem.create", arguments: {path: "file", content: "private-content-marker"}}))
    const body = await response.json() as {result: {bytes: number}}
    expect(response.status, "Запись завершилась несмотря на включённый журнал").toBe(200)
    expect(Object.keys(body), "Ответ записи содержит только result").toEqual(["result"])
    expect(body.result.bytes, "Результат сообщает записанный объём").toBe(Buffer.byteLength("private-content-marker"))
    expect(readFileSync(join(root, "file"), "utf8"), "Диагностика не меняет данные файла").toBe("private-content-marker")
    const encoded = JSON.stringify(logs)
    expect(encoded.includes(token), "Токен отсутствует в событиях журнала").toBeFalse()
    expect(encoded.includes("private-content-marker"), "Содержимое файла отсутствует в событиях журнала").toBeFalse()
    expect(encoded.includes(response.headers.get("x-request-id")!), "Заголовок request id связывает ответ с диагностикой").toBeTrue()
  }))

  test("Ошибка logger не отменяет завершённую операцию", () => fixture(async (workspace, root) => {
    const app = createRequestHandler({workspace, token, logger: () => { throw new Error("logger unavailable") }})
    const response = await app.handle(post({name: "filesystem.create", arguments: {path: "file", content: "ok"}}))
    expect(response.status, "Сбой записи диагностики не меняет успешный HTTP-статус").toBe(200)
    expect(readFileSync(join(root, "file"), "utf8"), "Ранее завершённая операция сохраняет результат").toBe("ok")
  }))
})
