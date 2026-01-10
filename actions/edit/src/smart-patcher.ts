import type { FileOperation } from "./types"

/**
 * Супер-Агрессивная нормализация для сравнения "сути" строки.
 * Удаляет всё, кроме букв (любого языка) и цифр.
 * Превращает "## 🛠️ Header" в "header"
 */
const normalizeAggressive = (str: string) => {
  return (
    str
      // Удаляем всё, что НЕ буква (L) и НЕ цифра (N).
      // Флаг u (unicode) обязателен.
      .replace(/[^\p{L}\p{N}]/gu, "")
      .toLowerCase()
  )
}

/**
 * Мягкая нормализация (для очень коротких строк, где агрессивная опасна).
 * Например, для строк "}", "},", "return true".
 * Здесь мы оставляем пунктуацию, но схлопываем пробелы.
 */
const normalizeSoft = (str: string) => {
  return str.trim().replace(/\s+/g, " ")
}

export function applySmartPatch(content: string, op: FileOperation): string {
  // 1. Простые операции
  if (op.action === "create" || op.action === "overwrite") {
    return op.replace || ""
  }

  if (!op.search) {
    throw new Error(`Для действия '${op.action}' необходимо поле 'search'`)
  }

  // 2. Попытка №1: Точный поиск (самый быстрый)
  if (op.search && content.includes(op.search)) {
    // Проверка на дубликаты
    const first = content.indexOf(op.search)
    const last = content.lastIndexOf(op.search)
    if (first !== last) console.warn(`⚠️ Warning: Duplicate match found. Replacing first occurrence.`)

    const replaceWith = op.action === "delete" ? "" : op.replace || ""
    return content.replace(op.search, replaceWith)
  }

  // 3. Попытка №2: Fuzzy Search (Умный поиск)
  const fileLines = content.split("\n")
  // Фильтруем пустые строки из search, чтобы не искать "пустоту"
  const searchLines = op.search!.split("\n").filter((l) => l.trim() !== "")

  if (searchLines.length === 0) {
    throw new Error("❌ Search block is empty.")
  }

  for (let i = 0; i < fileLines.length; i++) {
    // Решаем, какую нормализацию использовать для первой строки (Якоря)
    // Если строка длинная (>5 символов текста) -> Агрессивная (игнорим мусор)
    // Если строка короткая ("}", "else") -> Мягкая (важна пунктуация)
const searchAnchor = searchLines[0]!
const useAggressive = normalizeAggressive(searchAnchor).length > 5
const normFile = useAggressive ? normalizeAggressive(fileLines[i]!) : normalizeSoft(fileLines[i]!)
const normSearch = useAggressive ? normalizeAggressive(searchAnchor) : normalizeSoft(searchAnchor)

    // Проверка якоря
    // Для агрессивного режима используем includes, чтобы найти "Header" внутри "## Header"
    const isAnchorMatch = useAggressive ? normFile.includes(normSearch) : normFile === normSearch

    if (isAnchorMatch) {
      // Якорь совпал! Проверяем весь блок.
      let isMatch = true
      let fileOffset = 0

      for (let j = 1; j < searchLines.length; j++) {
        // Пропускаем пустые строки в файле
        while (i + fileOffset + 1 < fileLines.length && fileLines[i + fileOffset + 1]!.trim() === "") {
          fileOffset++
        }

        const nextFileLine = fileLines[i + fileOffset + 1]
        const currentSearchLine = searchLines[j]

        // Если файл кончился раньше времени
        if (!nextFileLine) {
          isMatch = false
          break
        }

        // Выбираем режим для ТЕКУЩЕЙ строки
        const useAggressiveInner = normalizeAggressive(currentSearchLine!).length > 5
        const nFile = useAggressiveInner ? normalizeAggressive(nextFileLine!) : normalizeSoft(nextFileLine!)
        const nSearch = useAggressiveInner ? normalizeAggressive(currentSearchLine!) : normalizeSoft(currentSearchLine!)

        if (nFile !== nSearch) {
          isMatch = false
          break
        }
        fileOffset++
      }

      if (isMatch) {
        // УРА! НАШЛИ!
        const startIndex = i
        const linesToRemove = fileOffset + 1

        console.log(`🔍 Fuzzy Match applied at line ${startIndex + 1}`)

        const newBlockLines = op.action === "delete" ? [] : (op.replace || "").split("\n")
        fileLines.splice(startIndex, linesToRemove, ...newBlockLines)

        return fileLines.join("\n")
      }
    }
  }

  throw new Error(`❌ Block not found.\nSearch:\n---\n${op.search}\n---`)
}
