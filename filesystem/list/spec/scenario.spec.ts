import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdirSync, symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import listFiles from "@zavx0z/ai-filesystem-list"
import type {Zavx0zAiFilesystemList} from "@zavx0z/ai-filesystem-list"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {
    name: "Рекурсивный каталог с Git и ссылкой",
    prepare: (root: string) => {
      mkdirSync(join(root, ".git"))
      writeFileSync(join(root, ".git/config"), "private")
      mkdirSync(join(root, "dir"))
      writeFileSync(join(root, "dir/file"), "ok")
      symlinkSync("dir", join(root, "link"))
    },
    input: {recursive: true},
    expected: {paths: ["dir/file", "link"], count: null, truncated: false, depthLimited: false},
  },
  {
    name: "Лимит числа записей",
    prepare: (root: string) => {
      for (let i = 0; i < 5; i++) writeFileSync(join(root, `${i}`), "")
    },
    input: {maxEntries: 2},
    expected: {paths: [], count: 2, truncated: true, depthLimited: false},
  },
  {
    name: "Лимит глубины",
    prepare: (root: string) => {
      mkdirSync(join(root, "a/b"), {recursive: true})
      writeFileSync(join(root, "a/b/file"), "")
    },
    input: {recursive: true, maxDepth: 1},
    expected: {paths: [], count: null, truncated: true, depthLimited: true},
  },
  {
    name: "Пустой каталог",
    prepare: (_root: string) => {},
    input: {},
    expected: {paths: [], count: 0, truncated: false, depthLimited: false},
  },
])("$name", ({prepare, input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: Zavx0zAiFilesystemList.Output

  beforeAll(() => {
    frame = createFixture()
    prepare(frame.root)
    result = listFiles(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Полнота инвентаря", () => {
    expect(result.truncated, "Инвентарь сообщает, остались ли записи за установленным пределом").toBe(expected.truncated)
    expect(result.depthLimited, "Ограничение глубины отражается отдельно от числа записей").toBe(expected.depthLimited)
  })

  test("Состав путей", () => {
    const paths = result.entries.map(entry => entry.path)
    if (expected.count !== null) expect(paths.length, "Количество возвращённых записей соответствует лимиту или пустому каталогу").toBe(expected.count)
    for (const path of expected.paths) expect(paths, "Допустимые дочерние пути присутствуют в инвентаре").toContain(path)
    expect(paths.some(path => path.includes(".git") || path.startsWith("link/")), "Git и содержимое каталогов по ссылке не раскрываются").toBeFalse()
  })
})
