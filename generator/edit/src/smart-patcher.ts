// src/smart-patcher.ts
import type { FileOperation } from "./types"

/**
 * Нормализует строку: триммит и заменяет любые пробелы на один пробел.
 */
const normalizeLine = (line: string) => line.trim().replace(/\s+/g, " ")

export function applySmartPatch(content: string, op: FileOperation): string {
  // 1. Создание и Перезапись
  if (op.action === "create" || op.action === "overwrite") {
    return op.replace || ""
  }

  // Для остальных нужен search
  if (!op.search) {
    throw new Error(`Для действия '${op.action}' необходимо поле 'search'`)
  }

  // 2. Попытка №1: Точный поиск (Exact Match)
  if (content.includes(op.search)) {
    const first = content.indexOf(op.search)
    const last = content.lastIndexOf(op.search)
    if (first !== last) {
      console.warn(`⚠️ ПРЕДУПРЕЖДЕНИЕ: Блок кода найден несколько раз. Заменяем ПЕРВОЕ вхождение.`)
    }
    const replaceWith = op.action === "delete" ? "" : op.replace || ""
    return content.replace(op.search, replaceWith)
  }

  // 3. Попытка №2: Умный поиск (Fuzzy Match)
  const fileLines = content.split("\n")
    const searchLines = (op.search || '')
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "")

  if (searchLines.length === 0) {
    throw new Error("❌ Блок search пустой или состоит только из пробелов.")
  }

  for (let i = 0; i < fileLines.length; i++) {
    const normFileLine = normalizeLine(fileLines[i]!)
    const normSearchStart = normalizeLine(searchLines[0]!)

    // ЯКОРЬ: Проверяем начало блока.
    // .includes позволяет найти 'render()' даже если в файле 'public render()'
    const isAnchorMatch =
      searchLines.length > 1 ? normFileLine.includes(normSearchStart) : normFileLine === normSearchStart

    if (isAnchorMatch) {
      // Проверяем хвост блока
      let isMatch = true
      let fileOffset = 0

      for (let j = 1; j < searchLines.length; j++) {
        // Пропускаем пустые строки в файле
        while (i + fileOffset + 1 < fileLines.length && fileLines[i + fileOffset + 1]!.trim() === "") {
          fileOffset++
        }

      const nextFileLine = fileLines[i + fileOffset + 1]
      const searchLine = searchLines[j]!
      
      if (!nextFileLine || normalizeLine(nextFileLine) !== normalizeLine(searchLine)) {
        isMatch = false
        break
      }
        fileOffset++
      }

      if (isMatch) {
      const startIndex = i
      const linesToRemove = fileOffset + 1

      console.log(`🔍 Fuzzy Match: найден блок на строке ${startIndex + 1}`)

      const newBlockLines = op.action === "delete" ? [] : (op.replace || '').split("\n")
      fileLines.splice(startIndex, linesToRemove, ...newBlockLines)

      return fileLines.join("\n")
      }
    }
  }

  throw new Error(
    `❌ Не удалось найти блок кода!\n` +
      `Проверьте модификаторы (public/private) и аргументы.\n` +
      `Искали:\n---\n${op.search}\n---`
  )
}
