import type { FileOperation } from "./types"

/**
 * Нормализация строки - удаление всех пробельных символов (пробелы, табы, переносы).
 */
const normalizeWhitespace = (str: string) => {
  return str.replace(/\s+/g, '')
}

export function applySmartPatch(content: string, op: FileOperation): string {
  // 1. Простые операции
  if (op.action === "create" || op.action === "overwrite") {
    return op.replace || ""
  }

  if (!op.search) {
    throw new Error(`Для действия '${op.action}' необходимо поле 'search'`)
  }

  // Нормализуем контент и поисковый запрос, удаляя все пробельные символы
  const normalizedContent = normalizeWhitespace(content)
  const normalizedSearch = normalizeWhitespace(op.search)

  // Ищем нормализованный поисковый запрос в нормализованном контенте
  const index = normalizedContent.indexOf(normalizedSearch)
  
  if (index === -1) {
    throw new Error(`❌ Block not found.\nSearch:\n---\n${op.search}\n---`)
  }

  // Находим границы совпадения в оригинальном контенте
  let matchStart = 0
  let matchEnd = content.length
  let normalizedIndex = 0
  
    // Ищем начало совпадения в оригинальном контенте
  for (let i = 0; i < content.length; i++) {
    if (!/\s/.test(content.charAt(i))) {
      if (normalizedIndex === index) {
        matchStart = i
        break
      }
      normalizedIndex++
    }
  }  // Ищем конец совпадения в оригинальном контенте
  let searchLength = 0
  for (let i = 0; i < op.search.length; i++) {
    if (!/\s/.test(op.search.charAt(i))) {
      searchLength++
    }
  }  normalizedIndex = 0
  for (let i = 0; i < content.length; i++) {
    if (!/\s/.test(content.charAt(i))) {
      if (normalizedIndex === index + searchLength) {
        matchEnd = i
        break
      }
      normalizedIndex++
    }
  }// Вырезаем найденный блок из оригинального контента
  const beforeMatch = content.substring(0, matchStart)
  const afterMatch = content.substring(matchEnd)
  
  if (op.action === "delete") {
    return beforeMatch + afterMatch
  }
  
  return beforeMatch + (op.replace || "") + afterMatch
}
