/** Один обработчик закрепляется за назначенной областью и исполняет явные запросы. */
import {afterAll, describe, expect, test} from "bun:test"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import createRequestHandler from "@server/request"
import testing from "@ai/testing"
import {repositoryRoot, token, post} from "./fixture.ts"

describe.each([
  {name: "Описание функции", request: {node: "ai/filesystem/read"}, expected: "ai/filesystem/read"},
  {name: "Чтение файла", request: {node: "ai/filesystem/read", action: "run", input: {path: "file"}}, expected: "данные"},
])("$name", async ({request, expected}) => {
  const fixture = testing.createFixture()
  afterAll(() => fixture.close())
  writeFileSync(join(fixture.root, "file"), "данные")
  const result = createRequestHandler({workspace: fixture.context, token, repositoryRoot})
  const response = await result.handle(post(request))
  const data = await response.json()

  test("HTTP-результат", () => {
    expect(response.status, "Допустимый запрос возвращает 200").toBe(200)
    expect(data.content ?? data.node, "Описание раскрывает адрес; исполнение возвращает содержимое назначенного файла").toBe(expected)
  })
})
