import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import gitStatus from "@zavx0z/ai-git-status"
import type {Zavx0zAiGitStatus} from "@zavx0z/ai-git-status"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

const git = (root: string, ...args: string[]): void => {
  const result = spawnSync("git", args, {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.invalid",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.invalid",
    },
  })
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr.toString()}`)
}

describe.each([
  {
    name: "Неотслеживаемое имя с переводом строки",
    prepare: (root: string) => {
      git(root, "init", "-q")
      writeFileSync(join(root, "unusual name\n.txt"), "data")
    },
    input: {},
    expected: {path: "unusual name\n.txt", originalPath: null, index: "?", count: null, truncated: false},
  },
  {
    name: "Перемещение в индексе",
    prepare: (root: string) => {
      git(root, "init", "-q")
      writeFileSync(join(root, "old name"), "unchanged contents")
      git(root, "add", ".")
      git(root, "-c", "commit.gpgsign=false", "commit", "-qm", "fixture")
      git(root, "mv", "old name", "new name")
    },
    input: {},
    expected: {path: "new name", originalPath: "old name", index: null, count: null, truncated: false},
  },
  {
    name: "Ограниченный статус",
    prepare: (root: string) => {
      git(root, "init", "-q")
      writeFileSync(join(root, "a"), "a")
      writeFileSync(join(root, "b"), "b")
    },
    input: {maxEntries: 1},
    expected: {path: null, originalPath: null, index: null, count: 1, truncated: true},
  },
])("$name", ({prepare, input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: Zavx0zAiGitStatus.Output

  beforeAll(() => {
    frame = createFixture()
    prepare(frame.root)
    result = gitStatus(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Граница результата", () => {
    expect(result.truncated, "Признак усечения отражает лимит числа возвращённых записей").toBe(expected.truncated)
    if (expected.count !== null) expect(result.entries.length, "Количество записей не превышает заданный предел").toBe(expected.count)
  })

  test("Разбор имени и состояния", () => {
    if (expected.path !== null) expect(result.entries[0]?.path, "Git имя читается по NUL разделителям без разбора через shell").toBe(expected.path)
    if (expected.originalPath !== null) expect(result.entries[0]?.originalPath, "Переименование содержит исходное имя отдельно от нового").toBe(expected.originalPath)
    if (expected.index !== null) expect(result.entries[0]?.index, "Неотслеживаемый путь обозначен символом вопроса в индексе").toBe(expected.index)
  })
})
