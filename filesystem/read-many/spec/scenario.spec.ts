import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import readFiles from "@zavx0z/ai-filesystem-read-many"
import type {Zavx0zAiFilesystemReadMany} from "@zavx0z/ai-filesystem-read-many"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {
    name: "Общий бюджет байтов",
    files: [{path: "a", content: "1234"}, {path: "b", content: "5678"}],
    input: {paths: ["a", "b", "a"], maxTotalBytes: 5},
    expected: {bytesRead: 5, remainingBytes: 0, truncated: true, errorIndex: 2, resultIndex: null},
  },
  {
    name: "Ошибка одного файла",
    files: [{path: "ok", content: "yes"}],
    input: {paths: ["missing", "ok"]},
    expected: {bytesRead: 3, remainingBytes: null, truncated: true, errorIndex: 0, resultIndex: 1},
  },
])("$name", ({files, input, expected}) => {
  let frame: ReturnType<typeof createFixture>
  let result: Zavx0zAiFilesystemReadMany.Output

  beforeAll(() => {
    frame = createFixture()
    for (const file of files) writeFileSync(join(frame.root, file.path), file.content)
    result = readFiles({...input, paths: [...input.paths]}, frame.context)
  })
  afterAll(() => frame?.close())

  test("Бюджет", () => {
    expect(result.bytesRead, "Общий объём учитывает прочитанные файлы и частичные диапазоны").toBe(expected.bytesRead)
    if (expected.remainingBytes !== null) {
      expect(result.remainingBytes, "После исчерпания бюджета не остаётся доступных байтов").toBe(expected.remainingBytes)
    }
    expect(result.truncated, "Неполный пакет сообщает как об исчерпанном бюджете, так и об ошибке отдельного файла").toBe(expected.truncated)
  })

  test("Ответы по файлам", () => {
    expect("error" in result.files[expected.errorIndex]!, "Ошибка отдельного файла сохраняется в его позиции").toBeTrue()
    if (expected.resultIndex !== null) {
      expect("result" in result.files[expected.resultIndex]!, "Успешное чтение другого файла остаётся доступным").toBeTrue()
    }
  })
})
