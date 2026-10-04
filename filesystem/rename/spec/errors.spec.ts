import {describe, expect, test} from "bun:test"
import assert from "node:assert/strict"
import {mkdirSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import renamePath from "@filesystem/rename"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки перемещения", () => {
  test("Существующая цель", () => fixture((context, root) => {
    writeFileSync(join(root, "a"), "a")
    writeFileSync(join(root, "b"), "b")
    assert.throws(() => renamePath({from: "a", to: "b"}, context), hasCode("CONFLICT"), "Перемещение не перезаписывает существующую цель")
    expect(readFileSync(join(root, "b"), "utf8"), "Содержимое цели после конфликта сохраняется").toBe("b")
  }))

  test("Перемещение рабочей директории", () => fixture(context => {
    assert.throws(() => renamePath({from: ".", to: "root"}, context), hasCode("PATH_NOT_ALLOWED"), "Рабочая директория не является переносимым объектом")
  }))

  test("Каталог внутрь себя", () => fixture((context, root) => {
    mkdirSync(join(root, "dir"))
    assert.throws(() => renamePath({from: "dir", to: "dir/nested"}, context), hasCode("INVALID_INPUT"), "Каталог нельзя переместить в собственного потомка")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => renamePath({root: "repo", from: "a", to: "b"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
