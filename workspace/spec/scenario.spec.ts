/** Назначение области хостом не меняет рабочую директорию процесса. */
import {afterAll, describe, expect, test} from "bun:test"
import {mkdtempSync, realpathSync, rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import createWorkspace from "@zavx0z/ai-workspace"

describe.each([
  {name: "Отдельная область сессии", prefix: "ai-assigned-"},
])("$name", ({prefix}) => {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  afterAll(() => rmSync(directory, {recursive: true, force: true}))
  const cwd = process.cwd()
  const result = createWorkspace({directory})

  test("Назначение", () => {
    expect(result.directory(), "Контекст сохраняет каноническую директорию, переданную хостом").toBe(realpathSync(directory))
  })
  test("Неизменяемость", () => {
    expect(Object.isFrozen(result), "Переданный исполнителю контекст не допускает замены своих методов").toBe(true)
  })
  test("Процесс", () => {
    expect(process.cwd(), "Назначение сессии не меняет cwd остальных участников процесса").toBe(cwd)
  })
})
