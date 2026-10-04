import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import applyPatch from "@ai-filesystem/apply-patch"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки применения patch", () => {
  test("Предварительная проверка всех операций", () => fixture((context, root) => {
    writeFileSync(join(root, "existing"), "actual\n")
    const patch = "*** Begin Patch\n*** Add File: new/file\n+x\n*** Update File: existing\n@@\n-wrong\n+bad\n*** End Patch"
    assert.throws(() => applyPatch({patch}, context), hasCode("PATCH_REJECTED"), "Ошибка поздней операции отклоняет patch до записи ранней")
    expect(existsSync(join(root, "new")), "Предварительная проверка не создаёт каталог новой записи").toBeFalse()
    expect(readFileSync(join(root, "existing"), "utf8"), "Исходный файл остаётся без изменений").toBe("actual\n")
  }))

  test("Неоднозначный контекст", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "x\nx\n")
    const patch = "*** Begin Patch\n*** Update File: file\n@@\n-x\n+y\n*** End Patch"
    assert.throws(() => applyPatch({patch}, context), hasCode("PATCH_REJECTED"), "Неоднозначное совпадение не выбирается произвольно")
  }))

  test("Повторённый путь", () => fixture((context, root) => {
    const patch = "*** Begin Patch\n*** Add File: new\n+x\n*** Add File: new\n+y\n*** End Patch"
    assert.throws(() => applyPatch({patch}, context), hasCode("PATCH_REJECTED"), "Две операции с одним путём отклоняются")
    expect(existsSync(join(root, "new")), "После отказа новый файл отсутствует").toBeFalse()
  }))

  test("Выход за рабочую директорию", () => fixture((context, root) => {
    const patch = "*** Begin Patch\n*** Add File: good\n+x\n*** Add File: ../outside\n+y\n*** End Patch"
    assert.throws(() => applyPatch({patch}, context), hasCode("PATH_NOT_ALLOWED"), "Запрещённый поздний путь отклоняет весь patch до записи")
    expect(existsSync(join(root, "good")), "Допустимая ранняя операция не применяется частично").toBeFalse()
  }))

  test("Некорректный UTF-8", () => fixture((context, root) => {
    writeFileSync(join(root, "binary"), Buffer.from([255]))
    const patch = "*** Begin Patch\n*** Update File: binary\n@@\n-a\n+b\n*** End Patch"
    assert.throws(() => applyPatch({patch}, context), hasCode("PATCH_REJECTED"), "Текстовый patch не изменяет файл с некорректным UTF-8")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => applyPatch({root: "repo", patch: "*** Begin Patch\n*** End Patch"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
