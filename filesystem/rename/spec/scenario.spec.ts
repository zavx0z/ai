import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import renamePath from "@zavx0z/ai-filesystem-rename"
import type {Zavx0zAiFilesystemRename} from "@zavx0z/ai-filesystem-rename"
import testing from "@zavx0z/ai-testing"

const {createFixture} = testing

describe.each([
  {name: "Перемещение файла", from: "from", to: "to", content: "data"},
])("$name", ({from, to, content}) => {
  let frame: ReturnType<typeof createFixture>
  let result: Zavx0zAiFilesystemRename.Output

  beforeAll(() => {
    frame = createFixture()
    writeFileSync(join(frame.root, from), content)
    result = renamePath({from, to}, frame.context)
  })
  afterAll(() => frame?.close())

  test("Перемещённый файл", () => {
    expect(result.renamed, "Ответ подтверждает перемещение внутри рабочей директории").toBeTrue()
    expect(existsSync(join(frame.root, from)), "Исходный путь больше не существует").toBeFalse()
    expect(readFileSync(join(frame.root, to), "utf8"), "Новый путь содержит исходные данные").toBe(content)
  })
})
