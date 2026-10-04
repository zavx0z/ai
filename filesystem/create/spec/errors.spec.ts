import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {existsSync, readFileSync, symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import createFile from "@filesystem/create"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки создания файла", () => {
  test("Существующий файл", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "hello")
    assert.throws(() => createFile({path: "file", content: "bad"}, context), hasCode("EEXIST"), "Создание не перезаписывает существующий файл")
    expect(readFileSync(join(root, "file"), "utf8"), "Конфликт оставляет исходное содержимое").toBe("hello")
  }))

  test("Отсутствующие родители", () => fixture((context, root) => {
    assert.throws(() => createFile({path: "a/file", content: ""}, context), hasCode("ENOENT"), "Родительские каталоги требуют явного разрешения")
    expect(existsSync(join(root, "a")), "Отказ не создаёт родительский каталог").toBeFalse()
  }))

  test("Предварительная проверка кодировки", () => fixture((context, root) => {
    assert.throws(() => createFile({path: "a/file", content: "!", encoding: "base64", createParents: true}, context), hasCode("INVALID_INPUT"), "Недопустимая base64 отклоняется до побочного эффекта")
    expect(existsSync(join(root, "a")), "Некорректный ввод не создаёт родительский каталог").toBeFalse()
  }))

  test("Висячая символическая ссылка", () => fixture((context, root) => {
    symlinkSync("missing", join(root, "link"))
    assert.throws(() => createFile({path: "link", content: "x"}, context), hasCode("PATH_NOT_ALLOWED"), "Ссылка не считается свободным местом для нового файла")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => createFile({root: "repo", path: "file", content: "x"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
