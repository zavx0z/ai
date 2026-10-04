/** Хост получает область до запуска и обслуживает файловый инструмент через HTTP. */
import {afterAll, describe, expect, test} from "bun:test"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import startServer from "@ai/server"
import testing from "@ai/testing"

describe.each([
  {name: "Loopback HTTP", content: "network", token: "temporary-loopback-test-token-123456789"},
])("$name", async ({content, token}) => {
  const fixture = testing.createFixture()
  afterAll(() => fixture.close())
  writeFileSync(join(fixture.root, "file"), content)
  const result = await startServer({directory: fixture.root, token, port: 0, log: false})
  afterAll(() => result.close())
  const response = await fetch(result.url, {
    method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
    body: JSON.stringify({name: "filesystem.read", arguments: {path: "file"}}),
  })
  const data = await response.json()
  test("Сетевое исполнение", () => {
    expect(response.status, "Настоящий HTTP listener обслуживает авторизованный запрос").toBe(200)
    expect(Object.keys(data), "Успешный сетевой ответ содержит только result").toEqual(["result"])
    expect(data.result.content, "Исполнитель читает файл из переданной хосту области").toBe(content)
  })
})
