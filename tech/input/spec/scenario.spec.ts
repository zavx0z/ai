/** Числовые аргументы получают явный default или сохраняют допустимое значение. */
import {describe, expect, test} from "bun:test"
import validation from "@zavx0z/ai-tech-input"

describe.each([
  {name: "Явное значение", value: 2, expected: 2},
  {name: "Значение по умолчанию", value: undefined, expected: 5},
])("$name", ({value, expected}) => {
  const result = validation.integer(value, 5, 1, 10, "limit")
  test("Принятый предел", () => {
    expect(result, "Отсутствующий предел заменяется default; допустимый сохраняется").toBe(expected)
  })
})
