/** Публичная ошибка сохраняет смысл отказа, HTTP-статус и разрешённые подробности. */
import {describe, expect, test} from "bun:test"
import ToolError from "@zavx0z/ai-tech-failure"

describe.each([
  {name: "Конфликт содержимого", code: "CONFLICT", message: "Content changed", status: 409},
  {name: "Неверные аргументы", code: "INVALID_INPUT", message: "Unknown field", status: 400},
])("$name", ({code, message, status}) => {
  const result = new ToolError(code, message, status)
  test("Данные отказа", () => {
    expect(result.code, "Машинный код не зависит от формулировки сообщения").toBe(code)
    expect(result.message, "Вызывающий код сохраняет безопасное описание причины").toBe(message)
    expect(result.status, "Транспорт получает статус, согласованный с причиной отказа").toBe(status)
  })
})
