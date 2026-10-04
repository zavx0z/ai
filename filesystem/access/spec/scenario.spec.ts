/** Базовое чтение ограничивает буфер и возвращает фактический размер файла. */
import {afterAll, describe, expect, test} from "bun:test"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import access from "@zavx0z/ai-filesystem-access"
import testing from "@zavx0z/ai-testing"

describe.each([
  {name: "Полное чтение", offset: 0, maxBytes: 8, content: "abcdef"},
  {name: "Диапазон байтов", offset: 2, maxBytes: 2, content: "cd"},
])("$name", ({offset, maxBytes, content}) => {
  const fixture = testing.createFixture()
  afterAll(() => fixture.close())
  const path = join(fixture.root, "file")
  writeFileSync(path, "abcdef")
  const result = access.readChunk(path, offset, maxBytes)
  test("Содержимое и размер", () => {
    expect(result.data.toString(), "Буфер содержит только фактически прочитанный диапазон").toBe(content)
    expect(result.size, "Полный размер файла не зависит от длины выбранного диапазона").toBe(6)
  })
})
