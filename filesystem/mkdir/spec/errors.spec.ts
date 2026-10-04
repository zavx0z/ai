import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import makeDirectory from "@zavx0z/ai-filesystem-mkdir"
import testing from "@zavx0z/ai-testing"

const {fixture, hasCode} = testing

describe("Ошибки создания каталога", () => {
  test("Рабочая директория защищена", () => fixture(context => {
    assert.throws(() => makeDirectory({path: "."}, context), hasCode("PATH_NOT_ALLOWED"), "Корневая директория не является целью создания")
  }))

  test("Флаг рекурсии имеет логический тип", () => fixture(context => {
    assert.throws(() => makeDirectory({path: "a", recursive: "true"} as never, context), hasCode("INVALID_INPUT"), "Строка не заменяет логический флаг рекурсивного создания")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => makeDirectory({root: "repo", path: "a"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
