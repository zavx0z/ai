import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {createHash} from "node:crypto"
import {chmodSync, readFileSync, readdirSync, statSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import writeFile from "@zavx0z/ai-filesystem-write"
import type {AiFilesystemWrite} from "@zavx0z/ai-filesystem-write"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {name: "Замена содержимого", before: "before", content: "after", mode: 0o660, expectedBytes: 5, expectedHash: null},
  {name: "Пустое содержимое", before: "before", content: "", mode: null, expectedBytes: 0, expectedHash: null},
  {name: "Замена с подтверждённым хешем", before: "before", content: "after", mode: null, expectedBytes: 5, expectedHash: createHash("sha256").update("before").digest("hex")},
])("$name", ({name, before, content, mode, expectedBytes, expectedHash}) => {
  let frame: ReturnType<typeof createFixture>
  let result: AiFilesystemWrite.Output

  beforeAll(() => {
    frame = createFixture()
    const path = join(frame.root, "file")
    writeFileSync(path, before)
    if (mode !== null) chmodSync(path, mode)
    result = writeFile({path: "file", content, ...(expectedHash === null ? {} : {expectedHash})}, frame.context)
  })
  afterAll(() => frame?.close())

  test("Новое содержимое", () => {
    expect(readFileSync(join(frame.root, "file"), "utf8"), "Существующий файл содержит записанный текст, включая пустую строку").toBe(content)
    expect(result.bytes, "Результат сообщает число записанных байтов").toBe(expectedBytes)
    expect(statSync(join(frame.root, "file")).size, "Размер файла соответствует новым данным").toBe(expectedBytes)
  })

  /** @remarks Сохранение заданной маски доступа проверяется в варианте с явными атрибутами. */
  describe.skipIf(name !== "Замена содержимого")("Сохранение атрибутов", () => {
    test("Права и соседние файлы", () => {
      expect(statSync(join(frame.root, "file")).mode & 0o777, "Замена сохраняет права исходного файла").toBe(mode!)
      expect(readdirSync(frame.root), "Атомарная замена не оставляет временные файлы рядом с результатом").toEqual(["file"])
    })
  })
})
