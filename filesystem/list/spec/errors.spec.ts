import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import listFiles from "@filesystem/list"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe("Устаревший выбор корня", () => {
  test("Поле root отклоняется", () => fixture(context => {
    assert.throws(() => listFiles({root: "repo"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
