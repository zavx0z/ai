import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {readFileSync, symlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import readFile from "@ai-filesystem/read"
import writeFile from "@ai-filesystem/write"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки записи", () => {
  test("Устаревший хеш", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "before")
    const expectedHash = readFile({path: "file"}, context).contentHash!
    writeFile({path: "file", content: "after", expectedHash}, context)
    assert.throws(() => writeFile({path: "file", content: "bad", expectedHash}, context), hasCode("CONFLICT"), "Изменившийся файл отклоняет запись с прежним хешем")
    expect(readFileSync(join(root, "file"), "utf8"), "Отказ не меняет существующее содержимое").toBe("after")
  }))

  test("Отсутствующий файл", () => fixture(context => {
    assert.throws(() => writeFile({path: "missing", content: ""}, context), hasCode("ENOENT"), "Запись не создаёт файл неявно")
  }))

  test("Символическая ссылка", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "before")
    symlinkSync("file", join(root, "link"))
    assert.throws(() => writeFile({path: "link", content: "bad"}, context), hasCode("PATH_NOT_ALLOWED"), "Запись через конечную ссылку запрещена")
    expect(readFileSync(join(root, "file"), "utf8"), "Цель ссылки сохраняет исходное содержимое").toBe("before")
  }))
})

describe.each(["abc", "!!!!", "Zh=="])("Неканоническая base64 %s", content => {
  test("Данные отклоняются", () => fixture((context, root) => {
    writeFileSync(join(root, "file"), "before")
    assert.throws(() => writeFile({path: "file", content, encoding: "base64"}, context), hasCode("INVALID_INPUT"), "Некорректная base64 не заменяет файл")
    expect(readFileSync(join(root, "file"), "utf8"), "Содержимое после отказа остаётся прежним").toBe("before")
  }))
})

describe("Устаревший выбор корня", () => {
  test("Поле root отклоняется", () => fixture(context => {
    assert.throws(() => writeFile({root: "repo", path: "file", content: "x"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
