import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import readFiles from "@ai-filesystem/read-many"
import testing from "@ai/testing"

const {fixture, hasCode} = testing

describe.each([[], Array(51).fill("x"), [1]])("Недопустимый набор %j", paths => {
  test("Пакет отклоняется до чтения", () => fixture(context => {
    assert.throws(() => readFiles({paths} as never, context), hasCode("INVALID_INPUT"), "Число и тип путей проверяются до операций чтения")
  }))
})

describe("Устаревший выбор корня", () => {
  test("Поле root отклоняется", () => fixture(context => {
    assert.throws(() => readFiles({root: "repo", paths: ["file"]} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
