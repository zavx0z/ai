import type { FileOperation } from "./types"
import { applyUnifiedDiff, parseUnifiedDiff } from "./unified-diff"
import { parseFileFormat, fileEditToOperation } from "./file-format"
import { parseJsonPatch, applyJsonPatchToJsonFile } from "./json-patch"
import { detectFormat, type PatchFormat } from "./format-detector"

const normalize = (str: string) => str.replace(/\s+/g, '')

function stripMarkdownCode(content: string): string {
  const trimmed = content.trim()
  
  if (trimmed.startsWith("```json") || trimmed.startsWith("```")) {
    const jsonStart = trimmed.indexOf("{")
    const arrayStart = trimmed.indexOf("[")
    
    if (jsonStart === -1 && arrayStart === -1) {
      return trimmed
    }
    
    const startIndex = jsonStart === -1 ? arrayStart! : arrayStart === -1 ? jsonStart! : Math.min(jsonStart, arrayStart)
    return trimmed.slice(startIndex)
  }
  
  return trimmed
}

/**
 * Главный интерфейс для применения патчей в любом формате
 */
export interface PatchInput {
  content: string      // Исходное содержимое файла патча
  filePath?: string    // Путь к файлу (для JSON patch)
}

export interface PatchOutput {
  results: Array<{
    file: string
    newContent: string
    created: boolean
  }>
  errors: Array<{
    file: string
    error: string
  }>
}

/**
 * Применяет патч к файлам
 * @param patchContent Содержимое патч-файла
 * @param readFile Функция для чтения файлов
 * @returns Результат применения патча
 */
export async function applyPatch(
  patchContent: string,
  readFile: (path: string) => Promise<string>,
  writeFile: (path: string, content: string) => Promise<void>
): Promise<PatchOutput> {
  const format = detectFormat(patchContent)
  const results: PatchOutput["results"] = []
  const errors: PatchOutput["errors"] = []
  
  switch (format) {
    case "unified-diff": {
      const fileDiffs = parseUnifiedDiff(patchContent)
      
      for (const fileDiff of fileDiffs) {
        try {
          const targetPath = fileDiff.newPath !== "/dev/null" ? fileDiff.newPath : fileDiff.oldPath
          
          let content = ""
          let created = false
          
          if (fileDiff.oldPath !== "/dev/null") {
            content = await readFile(fileDiff.oldPath)
          } else {
            created = true
          }
          
          const newContent = applyUnifiedDiff(content, fileDiff)
          results.push({ file: targetPath, newContent, created })
        } catch (error) {
          errors.push({
            file: fileDiff.newPath || fileDiff.oldPath,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      break
    }
    
    case "file-format": {
      const edits = parseFileFormat(patchContent)
      
      for (const edit of edits) {
        try {
          const op = fileEditToOperation(edit)
          let content = ""
          let created = false
          
          if (edit.mode === "rewrite") {
            created = true
            content = edit.content || ""
          } else {
            content = await readFile(edit.path)
            content = applySmartPatch(content, op)
          }
          
          results.push({ file: edit.path, newContent: content, created })
        } catch (error) {
          errors.push({
            file: edit.path,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      break
    }
    
    case "json-patch": {
      throw new Error("JSON patch требует указания пути к файлу")
    }

    case "ai-edit": {
      const parsed = JSON.parse(patchContent)
      
      // Массив операций {op, path, value}
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          try {
            const opType = item.op as string
            const filePath = item.path as string
            
            if (opType === "replace" || opType === "add") {
              const content = item.value as string
              results.push({ file: filePath, newContent: content, created: opType === "add" })
            } else {
              errors.push({
                file: filePath,
                error: `Неподдерживаемая операция: ${opType}`,
              })
            }
          } catch (error) {
            errors.push({
              file: item.path || "unknown",
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      }
      // Объект {description, operations}
      else if (typeof parsed === "object" && parsed.operations) {
        for (const op of parsed.operations as FileOperation[]) {
          try {
            let content = ""
            let created = false

            if (op.action === "create" || op.action === "overwrite") {
              created = true
              content = op.replace || op.content || ""
            } else {
              content = await readFile(op.file)
              content = applySmartPatch(content, op)
            }

            results.push({ file: op.file, newContent: content, created })
          } catch (error) {
            errors.push({
              file: op.file,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      }
      break
    }
  }

  return { results, errors }
}

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
