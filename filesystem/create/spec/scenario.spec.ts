import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {existsSync, readFileSync, statSync} from "node:fs"
import {join} from "node:path"
import createFile from "@filesystem/create"
import type {FilesystemCreate} from "@filesystem/create"
import testing from "@ai/testing"

const {createFixture} = testing

describe.each([
  {name: "Новый файл", input: {path: "file", content: "hello"}, expected: {path: "file", content: "hello", bytes: 5}},
  {name: "Создание родительских каталогов", input: {path: "a/file", content: "", createParents: true}, expected: {path: "a/file", content: "", bytes: 0}},
])("$name", ({input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: FilesystemCreate.Output

  beforeAll(() => {
    frame = createFixture()
    result = createFile(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Созданный файл", () => {
    const path = join(frame.root, expected.path)
    expect(existsSync(path), "Файл доступен по указанному относительному пути").toBeTrue()
    expect(readFileSync(path, "utf8"), "Содержимое нового файла совпадает с переданным текстом").toBe(expected.content)
    expect(statSync(path).size, "Размер созданного файла равен числу записанных байтов").toBe(expected.bytes)
    expect(result.bytes, "Ответ сообщает число записанных байтов").toBe(expected.bytes)
  })
})
