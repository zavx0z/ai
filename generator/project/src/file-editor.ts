/**
 * Функции для редактирования файлов по правилам JSON-формата
 */

export interface TextChange {
  type: "replace" | "insert" | "delete"
  line: number
  endLine?: number // только для replace и delete
  content: string // для replace и insert
}

export interface FileChange {
  file: string // абсолютный путь
  action: "edit" | "create" | "delete" | "rename"
  changes?: TextChange[] // только для edit
  newPath?: string // только для rename
  newContent?: string // только для create
}

export interface ChangeSet {
  description: string
  changes: FileChange[]
}

/**
 * Применяет изменения к тексту файла
 */
export function applyTextChanges(originalContent: string, changes: TextChange[]): string {
  const lines = originalContent.split("\n")
  let lineOffset = 0 // смещение из-за предыдущих изменений

  // Сортируем изменения по строке (с конца к началу для безопасной замены)
  const sortedChanges = [...changes].sort((a, b) => b.line - a.line)

  for (const change of sortedChanges) {
    const adjustedLine = change.line - 1 + lineOffset // переводим в 0-индекс

    switch (change.type) {
      case "insert":
        lines.splice(adjustedLine, 0, ...change.content.split("\n"))
        lineOffset += change.content.split("\n").length
        break

      case "replace":
        const startLine = adjustedLine
        const endLine = (change.endLine || change.line) - 1 + lineOffset
        const numLinesToReplace = endLine - startLine + 1

        // Удаляем старые строки и вставляем новые
        lines.splice(startLine, numLinesToReplace, ...change.content.split("\n"))

        // Корректируем offset на разницу в количестве строк
        lineOffset += change.content.split("\n").length - numLinesToReplace
        break

      case "delete":
        const deleteStart = adjustedLine
        const deleteEnd = (change.endLine || change.line) - 1 + lineOffset
        const numLinesToDelete = deleteEnd - deleteStart + 1

        lines.splice(deleteStart, numLinesToDelete)
        lineOffset -= numLinesToDelete
        break
    }
  }

  return lines.join("\n")
}

/**
 * Валидирует набор изменений
 */
export function validateChanges(changes: ChangeSet): string[] {
  const errors: string[] = []

  for (const [index, change] of changes.changes.entries()) {
    // Проверяем обязательные поля
    if (!change.file) {
      errors.push(`Изменение ${index}: отсутствует путь к файлу`)
      continue
    }

    switch (change.action) {
      case "edit":
        if (!change.changes || change.changes.length === 0) {
          errors.push(`Файл ${change.file}: для edit необходимо указать changes`)
        } else {
          // Валидируем каждое изменение
          for (const [cIndex, textChange] of change.changes.entries()) {
            if (textChange.line < 1) {
              errors.push(`Файл ${change.file}, изменение ${cIndex}: номер строки должен быть >= 1`)
            }
            if (textChange.endLine && textChange.endLine < textChange.line) {
              errors.push(`Файл ${change.file}, изменение ${cIndex}: endLine должен быть >= line`)
            }
            if ((textChange.type === "insert" || textChange.type === "replace") && !textChange.content) {
              errors.push(`Файл ${change.file}, изменение ${cIndex}: для ${textChange.type} необходимо указать content`)
            }
          }
        }
        break

      case "create":
        if (!change.newContent) {
          errors.push(`Файл ${change.file}: для create необходимо указать newContent`)
        }
        break

      case "rename":
        if (!change.newPath) {
          errors.push(`Файл ${change.file}: для rename необходимо указать newPath`)
        }
        break

      case "delete":
        // Ничего не проверяем для delete
        break

      default:
        errors.push(`Файл ${change.file}: неизвестное действие "${(change as any).action}"`)
    }
  }

  return errors
}
