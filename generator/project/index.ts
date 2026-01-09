import type { EditRules, FileChange } from "./src/types"
import { validateEditRules } from "./src/validator"

/**
 * Применяет изменения к содержимому файла
 * @param content Исходное содержимое файла
 * @param changes Список изменений
 * @returns Новое содержимое файла
 */
export function applyFileChanges(content: string, changes: FileChange[]): string {
  const lines = content.split("\n")
  let offset = 0 // Смещение из-за предыдущих изменений

  // Сортируем изменения по позиции для последовательного применения
  const sortedChanges = [...changes].sort((a, b) => {
    const lineA = a.line + (a.type === "insert" ? 0 : offset)
    const lineB = b.line + (b.type === "insert" ? 0 : offset)
    return lineA - lineB
  })

  sortedChanges.forEach((change) => {
    const adjustedLine = change.line + offset

    switch (change.type) {
      case "insert": {
        const insertLines = change.content!.split("\n")
        const insertIndex = adjustedLine - 1 // line - 1 для вставки ПОСЛЕ строки
        lines.splice(insertIndex + 1, 0, ...insertLines)
        offset += insertLines.length
        break
      }

      case "replace": {
        const replaceLines = change.content!.split("\n")
        const startIndex = adjustedLine - 1
        const endIndex = (change.endLine || adjustedLine) - 1

        if (startIndex < 0 || endIndex >= lines.length) {
          throw new Error(`Неверный диапазон строк для замены: ${adjustedLine}-${change.endLine}`)
        }

        const linesToRemove = endIndex - startIndex + 1
        lines.splice(startIndex, linesToRemove, ...replaceLines)
        offset += replaceLines.length - linesToRemove
        break
      }

      case "delete": {
        const startIndex = adjustedLine - 1
        const endIndex = (change.endLine || adjustedLine) - 1

        if (startIndex < 0 || endIndex >= lines.length) {
          throw new Error(`Неверный диапазон строк для удаления: ${adjustedLine}-${change.endLine}`)
        }

        const linesToRemove = endIndex - startIndex + 1
        lines.splice(startIndex, linesToRemove)
        offset -= linesToRemove
        break
      }
    }
  })

  return lines.join("\n")
}

/**
 * Обрабатывает правила редактирования (координация процесса)
 * @param rules JSON правила редактирования
 * @param fileContents Чтение содержимого файлов (функция для DI)
 * @param applyOperation Функция применения операции (для DI)
 */
export async function processEditRules(
  rules: EditRules,
  fileContents: (path: string) => Promise<string>,
  applyOperation: (op: any) => Promise<void>
): Promise<void> {
  validateEditRules(rules)

  console.log(`📝 ${rules.description}`)

  // Применяем операции в порядке указания
  for (const operation of rules.changes) {
    await applyOperation(operation)
  }
}

/**
 * Создает функцию для применения операций к файловой системе
 */
export function createFileSystemApplier() {
  return async function applyFileOperation(operation: any): Promise<void> {
    switch (operation.action) {
      case "edit": {
        const content = await Bun.file(operation.file).text()
        const newContent = applyFileChanges(content, operation.changes)
        await Bun.write(operation.file, newContent)
        console.log(`✅ Отредактирован: ${operation.file}`)
        break
      }

      case "create": {
        await Bun.write(operation.file, operation.newContent)
        console.log(`✅ Создан: ${operation.file}`)
        break
      }

      case "delete": {
        const file = Bun.file(operation.file)
        if (await file.exists()) {
          await file.delete()
          console.log(`✅ Удален: ${operation.file}`)
        } else {
          console.warn(`⚠️  Файл не найден: ${operation.file}`)
        }
        break
      }

      case "rename": {
        const source = Bun.file(operation.file)
        if (await source.exists()) {
          await Bun.write(operation.newPath, await source.text())
          await source.delete()
          console.log(`✅ Переименован: ${operation.file} → ${operation.newPath}`)
        } else {
          throw new Error(`Файл для переименования не найден: ${operation.file}`)
        }
        break
      }
    }
  }
}
