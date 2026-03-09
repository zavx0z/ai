/**
 * Unified Diff Parser
 * Парсит unified diff формат и возвращает список операций
 */

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface FileDiff {
  oldPath: string
  newPath: string
  hunks: DiffHunk[]
}

export function parseUnifiedDiff(content: string): FileDiff[] {
  const files: FileDiff[] = []
  const lines = content.split(/\r?\n/)
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    
    // Пропускаем заголовки diff --git и т.д.
    if (line.startsWith("diff ") || line.startsWith("index ")) {
      i++
      continue
    }
    
    // Ищем начало файла: --- a/path
    if (line.startsWith("--- ")) {
      const oldPathLine = line
      const newPathLine = lines[++i]
      
      if (!newPathLine || !newPathLine.startsWith("+++ ")) {
        throw new Error(`Invalid diff format: expected '+++' after '---' at line ${i}`)
      }
      
      const oldPath = stripDiffPrefix(oldPathLine.slice(4))
      const newPath = stripDiffPrefix(newPathLine.slice(4))
      
      const hunks: DiffHunk[] = []
      
      // Парсим ханки @@ -oldStart,oldLines +newStart,newLines @@
      while (++i < lines.length) {
        const hunkLine = lines[i]!
        
        if (!hunkLine.startsWith("@@")) {
          i-- // Возвращаемся на шаг назад для следующей итерации
          break
        }
        
        const match = hunkLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
        if (!match) {
          throw new Error(`Invalid hunk header: ${hunkLine}`)
        }
        
        const oldStart = parseInt(match[1]!, 10)
        const oldLines = parseInt(match[2] || "1", 10)
        const newStart = parseInt(match[3]!, 10)
        const newLines = parseInt(match[4] || "1", 10)
        
        const hunkLines: string[] = []
        
        // Читаем строки ханка
        while (++i < lines.length) {
          const hunkContentLine = lines[i]!

          // Конец ханка: новая @@, новый файл (---) или конец файла
          if (hunkContentLine.startsWith("@@") || hunkContentLine.startsWith("--- ") || hunkContentLine.startsWith("diff ")) {
            i--
            break
          }
          
          // Пропускаем служебные строки (но не удаляем/добавляем)
          if (hunkContentLine.startsWith("\\ No newline")) {
            continue
          }
          
          hunkLines.push(hunkContentLine)
        }
        
        hunks.push({
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: hunkLines,
        })
      }
      
      files.push({ oldPath, newPath, hunks })
    } else {
      i++
    }
  }
  
  return files
}

function stripDiffPrefix(path: string): string {
  if (path.startsWith("a/") || path.startsWith("b/")) {
    return path.slice(2)
  }
  return path
}

/**
 * Применяет unified diff к содержимому файла
 */
export function applyUnifiedDiff(content: string, fileDiff: FileDiff): string {
  const lines = content.split(/\r?\n/)
  
  // Сортируем ханки по позиции (с конца, чтобы сдвиги строк не ломали позиции)
  const sortedHunks = [...fileDiff.hunks].sort((a, b) => b.oldStart - a.oldStart)
  
  for (const hunk of sortedHunks) {
    applyHunk(lines, hunk)
  }
  
  return lines.join("\n")
}

function applyHunk(fileLines: string[], hunk: DiffHunk): void {
  // Находим позицию в файле (0-based индекс)
  const startIdx = hunk.oldStart - 1
  
  // Собираем ожидаемое старое содержимое из ханка
  const oldLines: string[] = []
  const newLines: string[] = []
  
  for (const line of hunk.lines) {
    if (line.startsWith("-")) {
      oldLines.push(line.slice(1))
    } else if (line.startsWith("+")) {
      newLines.push(line.slice(1))
    } else if (line.startsWith(" ")) {
      // Контекстная строка - присутствует и в старом, и в новом
      oldLines.push(line.slice(1))
      newLines.push(line.slice(1))
    }
  }
  
  // Проверяем, совпадает ли старое содержимое с файлом
  const expectedOld = fileLines.slice(startIdx, startIdx + oldLines.length)
  
  if (!arraysEqual(expectedOld, oldLines)) {
    // Пытаемся fuzzy matching - ищем по контекстным строкам
    const fuzzyMatchIdx = findFuzzyMatch(fileLines, oldLines, startIdx)
    if (fuzzyMatchIdx === -1) {
      throw new Error(
        `Hunk does not match file content at line ${hunk.oldStart}\nExpected:\n${oldLines.join("\n")}\nGot:\n${expectedOld.join("\n")}`
      )
    }
    // Применяем сдвиг
    const adjustedStartIdx = fuzzyMatchIdx
    fileLines.splice(adjustedStartIdx, oldLines.length, ...newLines)
  } else {
    // Точное совпадение - заменяем
    fileLines.splice(startIdx, oldLines.length, ...newLines)
  }
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

function findFuzzyMatch(fileLines: string[], oldLines: string[], startIdx: number): number {
  // Ищем совпадение по первой непустой контекстной строке
  const anchor = oldLines.find(line => line.trim() !== "")
  if (!anchor) return -1
  
  // Ищем в окрестностях startIdx
  const searchRadius = 10
  const minIdx = Math.max(0, startIdx - searchRadius)
  const maxIdx = Math.min(fileLines.length, startIdx + searchRadius)
  
  for (let i = minIdx; i < maxIdx; i++) {
    if (fileLines[i]?.trim() === anchor.trim()) {
      // Проверяем соседние строки
      let match = true
      for (let j = 0; j < oldLines.length && i + j < fileLines.length; j++) {
        const normFile = fileLines[i + j]?.trim() || ""
        const normOld = oldLines[j]?.trim() || ""
        if (normFile !== normOld) {
          match = false
          break
        }
      }
      if (match) return i
    }
  }
  
  return -1
}
