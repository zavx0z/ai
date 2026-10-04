import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {existsSync, mkdirSync, symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import removePath from "@zavx0z/ai-filesystem-remove"
import type {Zavx0zAiFilesystemRemove} from "@zavx0z/ai-filesystem-remove"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {
    name: "Рекурсивное удаление каталога",
    prepare: (root: string) => {
      mkdirSync(join(root, "dir"))
      writeFileSync(join(root, "dir/file"), "x")
    },
    input: {path: "dir", recursive: true},
    removedPath: "dir",
    retainedPath: null,
  },
  {
    name: "Удаление конечной ссылки",
    prepare: (root: string) => {
      writeFileSync(join(root, "target"), "x")
      symlinkSync("target", join(root, "link"))
    },
    input: {path: "link"},
    removedPath: "link",
    retainedPath: "target",
  },
  {
    name: "Удаление обычного файла",
    prepare: (root: string) => writeFileSync(join(root, "file"), "x"),
    input: {path: "file"},
    removedPath: "file",
    retainedPath: null,
  },
])("$name", ({prepare, input, removedPath, retainedPath}) => {
  let frame: ReturnType<typeof createFixture>
  let result: Zavx0zAiFilesystemRemove.Output

  beforeAll(() => {
    frame = createFixture()
    prepare(frame.root)
    result = removePath(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Состояние после удаления", () => {
    expect(result.removed, "Успешный ответ подтверждает удаление указанного пути").toBeTrue()
    expect(existsSync(join(frame.root, removedPath)), "Удалённый объект отсутствует в рабочей директории").toBeFalse()
    if (retainedPath !== null) expect(existsSync(join(frame.root, retainedPath)), "Цель удалённой ссылки сохраняется").toBeTrue()
  })
})
