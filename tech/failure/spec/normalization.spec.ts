/** Диагностика ОС преобразуется в безопасный отказ без абсолютного пути. */
import {describe, expect, test} from "bun:test"
import ToolError from "@tech/failure"

describe.each([
  {name: "Отсутствующий путь", error: {code: "ENOENT", message: "/private/path"}, code: "NOT_FOUND", status: 404},
  {name: "Неожиданная ошибка", error: {code: "EUNKNOWN", message: "/private/path"}, code: "INTERNAL_ERROR", status: 500},
])("$name", ({error, code, status}) => {
  const result = ToolError.from(error)
  test("Семантика отказа", () => {
    expect(result.code, "Код ОС переводится в публичный код инструмента").toBe(code)
    expect(result.status, "HTTP-статус согласован с видом отказа").toBe(status)
  })
  test("Секретные пути", () => {
    expect(result.message, "Исходный абсолютный путь не попадает в сообщение клиенту").not.toContain("/private/path")
  })
})
