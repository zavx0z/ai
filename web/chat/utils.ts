/**
 * Удаляет обёртку ```markdown и ``` вокруг сообщения
 */
export function stripMarkdownWrapper(message: string): string {
  const trimmed = message.trim()

  // Проверка на обёртку ```markdown ... ```
  const markdownBlockRegex = /^```markdown\s*([\s\S]*?)\s*```$/
  const match = trimmed.match(markdownBlockRegex)

  if (match?.[1]) {
    return match[1].trim()
  }

  // Проверка на общую обёртку ``` ... ``` (без указания языка)
  const genericBlockRegex = /^```\s*([\s\S]*?)\s*```$/
  const genericMatch = trimmed.match(genericBlockRegex)

  if (genericMatch?.[1]) {
    return genericMatch[1].trim()
  }

  return message
}
