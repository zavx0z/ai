import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import statPath from "@zavx0z/ai-filesystem-stat"
import type {AiFilesystemStat} from "@zavx0z/ai-filesystem-stat"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {name: "Обычный файл", path: "file.txt", prepare: (root: string) => writeFileSync(join(root, "file.txt"), "abc"), type: "file", size: 3},
  {name: "Корневой каталог", path: ".", prepare: (_root: string) => {}, type: "directory", size: null},
  {name: "Конечная символическая ссылка", path: "link", prepare: (root: string) => symlinkSync("/no-such-outside-target", join(root, "link")), type: "symlink", size: null},
])("$name", ({path, prepare, type, size}) => {
  let frame: ReturnType<typeof createFixture>
  let result: AiFilesystemStat.Output

  beforeAll(() => {
    frame = createFixture()
    prepare(frame.root)
    result = statPath({path}, frame.context)
  })
  afterAll(() => frame?.close())

  test("Тип записи", () => {
    expect(result.entry.type, "Тип пути определяется без разыменования конечной ссылки").toBe(type)
  })

  /** @remarks Точный размер задан только для подготовленного обычного файла. */
  describe.skipIf(size === null)("Обычный файл", () => {
    test("Размер", () => {
      expect(result.entry.size, "Размер файла равен числу записанных байтов").toBe(size!)
    })
  })

  /** @remarks Неразыменование конечной ссылки относится только к варианту symlink. */
  describe.skipIf(type !== "symlink")("Конечная символическая ссылка", () => {
    test("Скрытие цели", () => {
      expect(JSON.stringify(result).includes("outside-target"), "Ответ не раскрывает внешний адрес цели ссылки").toBeFalse()
    })
  })
})
