import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import statPath from "@ai-filesystem/stat"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Ошибки получения метаданных", () => {
  test("Скрытый каталог Git", () => fixture(context => {
    assert.throws(() => statPath({path: "nested/.git/config"}, context), hasCode("PATH_NOT_ALLOWED"), "Метаданные Git недоступны через вложенный путь")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => statPath({root: "repo", path: "."} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
