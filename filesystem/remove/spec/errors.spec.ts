import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {existsSync, mkdirSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import removePath from "@ai-filesystem/remove"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки удаления", () => {
  test("Непустой каталог без рекурсии", () => fixture((context, root) => {
    mkdirSync(join(root, "dir"))
    writeFileSync(join(root, "dir/file"), "x")
    expect(() => removePath({path: "dir"}, context), "Непустой каталог без явной рекурсии отклоняется").toThrow()
    expect(existsSync(join(root, "dir/file")), "После отказа файл внутри каталога сохраняется").toBeTrue()
  }))

  test("Защита рабочей директории", () => fixture(context => {
    assert.throws(() => removePath({path: ".", recursive: true}, context), hasCode("PATH_NOT_ALLOWED"), "Рабочую директорию удалять нельзя")
  }))

  test("Повторное удаление", () => fixture((context, root) => {
    // Первое удаление в том же контексте устанавливает состояние повторного вызова.
    writeFileSync(join(root, "file"), "x")
    removePath({path: "file"}, context)
    assert.throws(() => removePath({path: "file"}, context), hasCode("ENOENT"), "Отсутствующий файл даёт ошибку вместо ложного успеха")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => removePath({root: "repo", path: "file"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
