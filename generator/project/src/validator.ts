import type { EditRules, FileChange, FileOperation } from "./types"

export function validateEditRules(rules: unknown): asserts rules is EditRules {
  if (!rules || typeof rules !== "object") {
    throw new Error("Правила должны быть объектом")
  }

  const { description, changes } = rules as EditRules

  if (typeof description !== "string") {
    throw new Error('Поле "description" должно быть строкой')
  }

  if (!Array.isArray(changes)) {
    throw new Error('Поле "changes" должно быть массивом')
  }

  changes.forEach((operation, index) => {
    validateFileOperation(operation, index)
  })
}

function validateFileChange(change: unknown, index: number, opIndex: number): asserts change is FileChange {
  if (!change || typeof change !== "object") {
    throw new Error(`Изменение ${index} в операции ${opIndex} должно быть объектом`)
  }

  const { type, line, endLine, content } = change as FileChange

  const validTypes = ["insert", "replace", "delete"]
  if (!validTypes.includes(type)) {
    throw new Error(`Недопустимый тип изменения: ${type}`)
  }

  if (typeof line !== "number" || line < 1) {
    throw new Error(`Номер строки должен быть положительным числом (получено: ${line})`)
  }

  if (endLine !== undefined && (typeof endLine !== "number" || endLine < line)) {
    throw new Error(`endLine должен быть числом больше или равным line (${line})`)
  }

  if (content !== undefined && typeof content !== "string") {
    throw new Error("content должен быть строкой")
  }

  if ((type === "insert" || type === "replace") && content === undefined) {
    throw new Error(`Для типа ${type} обязательно поле content`)
  }
}

function validateFileOperation(operation: unknown, index: number): asserts operation is FileOperation {
  if (!operation || typeof operation !== "object") {
    throw new Error(`Операция ${index} должна быть объектом`)
  }

  const { file, action, changes, newPath, newContent } = operation as FileOperation

  if (typeof file !== "string" || !file) {
    throw new Error(`Поле "file" в операции ${index} обязательно и должно быть непустой строкой`)
  }

  const validActions = ["edit", "create", "delete", "rename"]
  if (!validActions.includes(action)) {
    throw new Error(`Недопустимое действие: ${action}`)
  }

  switch (action) {
    case "edit":
      if (!Array.isArray(changes) || changes.length === 0) {
        throw new Error(`Для действия "edit" обязательно поле "changes" с массивом изменений`)
      }
      changes.forEach((change, changeIndex) => {
        validateFileChange(change, changeIndex, index)
      })
      break

    case "create":
      if (typeof newContent !== "string") {
        throw new Error(`Для действия "create" обязательно поле "newContent"`)
      }
      break

    case "rename":
      if (typeof newPath !== "string" || !newPath) {
        throw new Error(`Для действия "rename" обязательно поле "newPath"`)
      }
      break

    case "delete":
      // Никаких дополнительных полей не требуется
      break
  }
}
