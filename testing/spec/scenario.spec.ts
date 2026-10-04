/** Фикстура предоставляет отдельную временную область и явное освобождение. */
import {afterAll, describe, expect, test} from "bun:test"
import {existsSync, realpathSync} from "node:fs"
import testing from "@ai/testing"

describe.each([{name: "Временная область"}])("$name", () => {
  const result = testing.createFixture()
  afterAll(() => result.close())
  test("Связь с исполнителем", () => {
    expect(result.context.directory(), "Контекст использует директорию именно этой фикстуры").toBe(realpathSync(result.root))
    expect(existsSync(result.root), "Директория существует до завершения проверок").toBe(true)
  })
})
