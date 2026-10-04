import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import applyPatch from "@ai-filesystem/apply-patch"
import type {AiFilesystemApplyPatch} from "@ai-filesystem/apply-patch"
import testing from "@ai/testing"

const {createFixture} = testing

describe.each([
  {
    name: "Добавление, изменение, перемещение и удаление",
    files: [{path: "old", content: "before\n"}, {path: "delete", content: "gone\n"}],
    input: {patch: "*** Begin Patch\n*** Add File: dir/added\n+hello\n*** Update File: old\n*** Move to: moved\n@@\n-before\n+after\n*** Delete File: delete\n*** End Patch\n"},
    expected: {applied: true, operations: ["add", "move", "delete"], files: [{path: "moved", content: "after\n"}, {path: "dir/added", content: "hello\n"}], absent: ["old", "delete"]},
  },
  {
    name: "Предпросмотр без записи",
    files: [],
    input: {dryRun: true, patch: "*** Begin Patch\n*** Add File: new/file\n+x\n*** End Patch"},
    expected: {applied: false, operations: null, files: [], absent: ["new"]},
  },
  {
    name: "Строки CRLF",
    files: [{path: "crlf", content: "before\r\n"}],
    input: {patch: "*** Begin Patch\n*** Update File: crlf\n@@\n-before\n+after\n*** End Patch"},
    expected: {applied: true, operations: null, files: [{path: "crlf", content: "after\r\n"}], absent: []},
  },
  {
    name: "Файл без последнего перевода строки",
    files: [{path: "plain", content: "before"}],
    input: {patch: "*** Begin Patch\n*** Update File: plain\n@@\n-before\n+after\n*** End Patch"},
    expected: {applied: true, operations: null, files: [{path: "plain", content: "after"}], absent: []},
  },
  {
    name: "Замена в конце файла",
    files: [{path: "file", content: "x\nx\n"}],
    input: {patch: "*** Begin Patch\n*** Update File: file\n@@\n-x\n+y\n*** End of File\n*** End Patch"},
    expected: {applied: true, operations: null, files: [{path: "file", content: "x\ny\n"}], absent: []},
  },
])("$name", ({files, input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: AiFilesystemApplyPatch.Output

  beforeAll(() => {
    frame = createFixture()
    for (const file of files) writeFileSync(join(frame.root, file.path), file.content)
    result = applyPatch(input, frame.context)
  })
  afterAll(() => frame?.close())

  test("Результат применения", () => {
    expect(result.applied, "Режим предпросмотра только проверяет patch; обычный режим применяет его").toBe(expected.applied)
    if (expected.operations !== null) {
      expect(result.changes.map(change => change.operation), "Список изменений сохраняет порядок и вид операций").toEqual([...expected.operations])
    }
  })

  test("Состояние файлов", () => {
    for (const file of expected.files) {
      expect(readFileSync(join(frame.root, file.path), "utf8"), "Изменённый файл содержит ожидаемый текст и переводы строк").toBe(file.content)
    }
    for (const path of expected.absent) {
      expect(existsSync(join(frame.root, path)), "Удалённые пути и каталоги предпросмотра отсутствуют").toBeFalse()
    }
  })
})
