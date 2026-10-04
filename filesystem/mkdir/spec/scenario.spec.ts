import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {existsSync, mkdirSync} from "node:fs"
import {join} from "node:path"
import makeDirectory from "@filesystem/mkdir"
import type {FilesystemMkdir} from "@filesystem/mkdir"
import testing from "@ai/testing"

const {createFixture} = testing

describe.each([
  {name: "Создание вложенного каталога", prepare: (_root: string) => {}, input: {path: "a/b", recursive: true}, created: true},
  {name: "Повторное создание", prepare: (root: string) => mkdirSync(join(root, "a/b"), {recursive: true}), input: {path: "a/b", recursive: true}, created: false},
])("$name", ({prepare, input, created}) => {
  let frame: ReturnType<typeof createFixture>
  let result: FilesystemMkdir.Output

  beforeAll(() => {
    frame = createFixture()
    prepare(frame.root)
    result = makeDirectory(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Результат создания", () => {
    expect(result.created, "Флаг созданного каталога различает новое и уже существующее место").toBe(created)
    expect(existsSync(join(frame.root, "a/b")), "После операции вложенный каталог доступен").toBeTrue()
  })
})
