import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import {mkdirSync, symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import readFile from "@zavx0z/ai-filesystem-read"
import testing from "@zavx0z/ai-testing"

const {fixture, hasCode} = testing

describe.each(["../secret", "/etc/passwd", "nested/../../x", "a/../x", ".git/config", "nested/.GIT/config", "C:/secret", "..\\secret", "bad\0name"])("Запрещённый путь %s", path => {
  test("Доступ отклоняется", () => fixture(context => {
    assert.throws(() => readFile({path}, context), hasCode("PATH_NOT_ALLOWED"), "Выход за рабочую директорию и доступ к Git запрещены")
  }))
})

describe("Ошибки чтения", () => {
  test("Конечная ссылка и ссылка в родителе", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "secret")
    mkdirSync(join(root, "dir"))
    symlinkSync("file", join(root, "link"))
    symlinkSync("dir", join(root, "parent"))
    assert.throws(() => readFile({path: "link"}, context), hasCode("PATH_NOT_ALLOWED"), "Конечная ссылка не раскрывает файл")
    assert.throws(() => readFile({path: "parent/missing"}, context), hasCode("PATH_NOT_ALLOWED"), "Ссылка в родительском пути не обходится")
  }))

  test.each([{maxBytes: 0}, {maxBytes: 8388609}, {offset: -1}, {offset: 1.5}, {encoding: "latin1"}])("Недопустимый параметр %j", extra => fixture((context, root) => {
    writeFileSync(join(root, "file"), "data")
    assert.throws(() => readFile({path: "file", ...extra} as never, context), hasCode("INVALID_INPUT"), "Диапазон и кодировка проверяются до чтения")
  }))

  test("Форма входа и тип цели", () => fixture((context, root) => {
    mkdirSync(join(root, "dir"))
    assert.throws(() => readFile(null as never, context), hasCode("INVALID_INPUT"), "Пустой вход не содержит обязательный путь")
    assert.throws(() => readFile({path: "dir"}, context), hasCode("INVALID_PATH_TYPE"), "Каталог нельзя прочесть как обычный файл")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => readFile({root: "repo", path: "file"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
