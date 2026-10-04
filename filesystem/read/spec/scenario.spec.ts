import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import readFile from "@ai-filesystem/read"
import type {AiFilesystemRead} from "@ai-filesystem/read"
import testing from "@ai/testing"

const {createFixture} = testing

describe.each([
  {name: "Полный текст", path: "hello.txt", content: "hello", input: {path: "hello.txt"}, expected: {content: "hello", bytesRead: 5, truncated: false, hash: "whole"}},
  {name: "Ограниченный диапазон", path: "file", content: "abcdef", input: {path: "file", offset: 1, maxBytes: 2}, expected: {content: "bc", bytesRead: 2, truncated: true, hash: "none"}},
  {name: "Пустой файл", path: "empty", content: "", input: {path: "empty"}, expected: {content: "", bytesRead: 0, truncated: false, hash: "whole"}},
  {name: "Смещение за концом файла", path: "empty", content: "", input: {path: "empty", offset: 100}, expected: {content: "", bytesRead: 0, truncated: false, hash: "none"}},
  {name: "Бинарный диапазон", path: "binary", content: Buffer.from([0, 255, 1, 128]), input: {path: "binary", encoding: "base64" as const, offset: 1, maxBytes: 2}, expected: {content: Buffer.from([255, 1]).toString("base64"), bytesRead: 2, truncated: true, hash: "none"}},
])("$name", ({path, content, input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: AiFilesystemRead.Output

  beforeAll(() => {
    frame = createFixture()
    writeFileSync(join(frame.root, path), content)
    result = readFile(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Содержимое и объём", () => {
    expect(result.content, "Прочитанное содержимое соответствует выбранному диапазону и кодировке").toBe(expected.content)
    expect(result.bytesRead, "Бюджет учитывает фактически прочитанные байты").toBe(expected.bytesRead)
  })

  test("Полнота чтения", () => {
    expect(result.truncated, "Признак усечения сообщает, остались ли непрочитанные байты").toBe(expected.truncated)
    if (expected.hash === "whole") {
      expect(result.contentHash, "Хеш полного файла представлен шестнадцатеричным SHA-256").toMatch(/^[a-f0-9]{64}$/)
    } else {
      expect(result.contentHash, "Частичный диапазон не выдаётся за хеш целого файла").toBeNull()
    }
  })

  /** @remarks Побайтовое сравнение относится к варианту с base64-кодированием. */
  describe.skipIf(path !== "binary")("Бинарные данные", () => {
    test("Точные байты", () => {
      expect(Buffer.from(result.content, "base64"), "Base64 сохраняет байты, включая неполные последовательности UTF-8").toEqual(Buffer.from([255, 1]))
    })
  })
})
