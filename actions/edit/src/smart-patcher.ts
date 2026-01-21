import type { FileOperation } from "./types"

/**
 * Супер-Агрессивная нормализация для сравнения "сути" строки.
 */
const normalizeAggressive = (str: string) => {
  return str.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()
}

/**
 * Мягкая нормализация.
 * Теперь еще и вырезает \r для совместимости с Windows.
 * Также заменяет табуляции и другие пробельные символы на одиночные пробелы.
 */
const normalizeSoft = (str: string) => {
  // Удаляем все пробельные символы (пробелы, табы, переносы) для максимальной гибкости поиска
  return str.replace(/\s+/g, "")
}

export function applySmartPatch(content: string, op: FileOperation): string {
  // 1. Простые операции
  if (op.action === "create" || op.action === "overwrite") {
    return op.replace || ""
  }

  if (!op.search) {
    throw new Error(`Для действия '${op.action}' необходимо поле 'search'`)
  }

  // === НОРМАЛИЗАЦИЯ ПЕРЕНОСОВ (CRLF -> LF) ===
  // Это позволяет точному поиску работать, даже если форматы файлов отличаются.
  // Мы временно нормализуем контент только для проверки, но замену делаем в оригинале,
  // чтобы не перелопатить весь файл (хотя replace все равно вернет строку).
  // ПРИМЕЧАНИЕ: Если мы хотим сохранить CRLF оригинала, логика усложняется.
  // Для упрощения Bun/Linux среды считаем, что работаем с LF.

  // 2. Попытка №1: Точный поиск (Fast Path)
  // Пытаемся найти как есть
  if (content.includes(op.search)) {
    return applyExactReplace(content, op)
  }

  // Пытаемся найти, игнорируя разницу \r\n и \n
  // Создаем версию для поиска с унифицированными переносами
  const contentNormalized = content.replace(/\r\n/g, "\n")
  const searchNormalized = op.search.replace(/\r\n/g, "\n")

  if (contentNormalized.includes(searchNormalized)) {
    // Если нашли с нормализованными переносами, нам нужно быть аккуратными.
    // .replace на оригинальном content не сработает.
    // В этом случае проще переключиться на FuzzyPath, он сам разбивает по строкам
    // и игнорирует типы переносов.
    console.log("⚠️ Exact match failed on line-endings, switching to Fuzzy...")
  }

  // 3. Попытка №2: Fuzzy Search (Smart Path)
  const fileLines = content.split(/\r?\n/) // Поддержка split для Windows/Linux
  const searchLines = op.search.split(/\r?\n/).filter((l) => l.trim() !== "")

  if (searchLines.length === 0) {
    throw new Error("❌ Search block is empty.")
  }

  for (let i = 0; i < fileLines.length; i++) {
    const searchAnchor = searchLines[0]!

    // Защита от слишком коротких якорей (например "}")
    if (searchLines.length === 1 && searchAnchor.trim().length < 5) {
      console.warn(`⚠️ Warning: Searching for very short fragment: "${searchAnchor}". Match might be incorrect.`)
    }

    const useAggressive = normalizeAggressive(searchAnchor).length > 5
    const normFile = useAggressive ? normalizeAggressive(fileLines[i]!) : normalizeSoft(fileLines[i]!)
    const normSearch = useAggressive ? normalizeAggressive(searchAnchor) : normalizeSoft(searchAnchor)

    const isAnchorMatch = useAggressive ? normFile.includes(normSearch) : normFile === normSearch

    if (isAnchorMatch) {
      let isMatch = true
      let fileOffset = 0

      for (let j = 1; j < searchLines.length; j++) {
        // Пропускаем пустые строки в файле (Smart Whitespace Ignore)
        while (i + fileOffset + 1 < fileLines.length && fileLines[i + fileOffset + 1]!.trim() === "") {
          fileOffset++
        }

        const nextFileLine = fileLines[i + fileOffset + 1]
        const currentSearchLine = searchLines[j]

        if (!nextFileLine) {
          isMatch = false
          break
        }

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
        const startIndex = i
        const linesToRemove = fileOffset + 1
        console.log(`🔍 Fuzzy Match applied at line ${startIndex + 1}`)

        const newBlockLines = op.action === "delete" ? [] : (op.replace || "").split(/\r?\n/)
        fileLines.splice(startIndex, linesToRemove, ...newBlockLines)

        return fileLines.join("\n")
      }
    }
  }

  throw new Error(`❌ Block not found.\nSearch:\n---\n${op.search}\n---`)
}

// Вынесли логику точной замены в функцию с фиксом $
function applyExactReplace(content: string, op: FileOperation): string {
  const first = content.indexOf(op.search!)
  const last = content.lastIndexOf(op.search!)
  if (first !== last) console.warn(`⚠️ Warning: Duplicate match found. Replacing first occurrence.`)

  let replaceWith = op.action === "delete" ? "" : op.replace || ""

  // 🔥 CRITICAL FIX: Экранирование спецсимволов замены JS ($&, $`, $', $n)
  // Если этого не сделать, строка "$`" вставит содержимое файла до совпадения.
  replaceWith = replaceWith.replace(/\$/g, "$$$$")

  return content.replace(op.search!, replaceWith)
}
