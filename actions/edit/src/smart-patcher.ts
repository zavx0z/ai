import type { FileOperation } from "./types"

const normalize = (str: string) => str.replace(/\s+/g, '')

export function applySmartPatch(content: string, op: FileOperation): string {
  // 1. Простые операции
  if (op.action === "create" || op.action === "overwrite") {
    return op.replace || ""
  }

  if (!op.search) {
    throw new Error(`Для действия '${op.action}' необходимо поле 'search'`)
  }

  // 2. Попытка №1: Точный поиск (Fast Path)
  if (content.includes(op.search)) {
    return applyExactReplace(content, op)
  }

  // 3. Попытка №2: Fuzzy Search (Smart Path)
  const fileLines = content.split(/\r?\n/)
  const searchLines = op.search.split(/\r?\n/).filter(line => normalize(line) !== "")

  if (searchLines.length === 0) {
    throw new Error("❌ Search block is empty.")
  }

  for (let i = 0; i < fileLines.length; i++) {
    const searchAnchor = searchLines[0]
    const normFile = normalize(fileLines[i]!)
    const normSearch = normalize(searchAnchor!)

    // Для якоря: если нормализованная строка короткая (меньше 5), то точное сравнение, иначе включение
    const isAnchorMatch = normSearch.length < 5 ? normFile === normSearch : normFile.includes(normSearch)

    if (isAnchorMatch) {
      let isMatch = true
      let fileOffset = 0

      // Проверяем последующие строки поискового блока
      for (let j = 1; j < searchLines.length; j++) {
        // Пропускаем пустые строки в файле (но не в поисковом блоке, потому что мы их уже отфильтровали)
        while (i + fileOffset + 1 < fileLines.length && normalize(fileLines[i + fileOffset + 1]!) === "") {
          fileOffset++
        }

        const nextFileLine = fileLines[i + fileOffset + 1]
        const currentSearchLine = searchLines[j]

        if (!nextFileLine) {
          isMatch = false
          break
        }

        // Для последующих строк используем точное сравнение нормализованных строк
        if (normalize(nextFileLine!) !== normalize(currentSearchLine!)) {
          isMatch = false
          break
        }
        fileOffset++
      }

      if (isMatch) {
        const startIndex = i
        const linesToRemove = fileOffset + 1
        const newBlockLines = op.action === "delete" ? [] : (op.replace || "").split(/\r?\n/)
        fileLines.splice(startIndex, linesToRemove, ...newBlockLines)
        return fileLines.join("\n")
      }
    }
  }

  throw new Error(`❌ Block not found.\nSearch:\n---\n${op.search}\n---`)
}

function applyExactReplace(content: string, op: FileOperation): string {
  const first = content.indexOf(op.search!)
  const last = content.lastIndexOf(op.search!)
  if (first !== last) console.warn(`⚠️ Warning: Duplicate match found. Replacing first occurrence.`)

  let replaceWith = op.action === "delete" ? "" : op.replace || ""
  // Экранирование $
  replaceWith = replaceWith.replace(/\$/g, "$$$$")

  return content.replace(op.search!, replaceWith)
}
