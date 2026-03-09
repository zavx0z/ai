/**
 * Format Detector
 * Определяет формат входного файла по первым строкам
 */

export type PatchFormat = "unified-diff" | "file-format" | "json-patch" | "ai-edit"

function stripMarkdownCode(content: string): string {
  const trimmed = content.trim()
  
  // Удаляем markdown-обёрку ```json ... ```
  if (trimmed.startsWith("```json") || trimmed.startsWith("```")) {
    // Находим первый [ или { после открывающей ```
    const jsonStart = trimmed.indexOf("{")
    const arrayStart = trimmed.indexOf("[")
    
    if (jsonStart === -1 && arrayStart === -1) {
      return trimmed
    }
    
    // Начинаем с первого JSON-символа
    const startIndex = jsonStart === -1 ? arrayStart! : arrayStart === -1 ? jsonStart! : Math.min(jsonStart, arrayStart)
    return trimmed.slice(startIndex)
  }
  
  return trimmed
}

export function detectFormat(content: string): PatchFormat {
  const trimmed = stripMarkdownCode(content)

  // 1. Unified Diff: начинается с "--- a/"
  if (trimmed.startsWith("--- a/") || trimmed.startsWith("--- /dev/null")) {
    return "unified-diff"
  }

  // 2. FILE: формат: начинается с "FILE:"
  if (trimmed.startsWith("FILE:")) {
    return "file-format"
  }

  // 3. JSON: начинается с "[" или "{"
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      
      // Массив операций
      if (Array.isArray(parsed)) {
        // Проверяем, JSON Patch ли это (RFC 6902 с path как JSON Pointer)
        if (parsed.every((item: any) => 
          typeof item === "object" && 
          "op" in item && 
          "path" in item && 
          typeof item.path === "string" && 
          item.path.startsWith("/")
        )) {
          return "json-patch"
        }
        // Иначе это AI Edit Operations (массив {op, path, value})
        if (parsed.every((item: any) => 
          typeof item === "object" && 
          "op" in item && 
          "path" in item
        )) {
          return "ai-edit"
        }
      }
      
      // Объект EditRequest
      if (typeof parsed === "object" && parsed !== null && "operations" in parsed) {
        return "ai-edit"
      }
    } catch {
      // Не валидный JSON, продолжаем проверки
    }
  }

  throw new Error(`Неизвестный формат патча. Ожидается один из: unified-diff, FILE:, JSON`)
}
