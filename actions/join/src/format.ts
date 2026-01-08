/**
 * Нумерует строки в тексте
 */
export function addLineNumbersToContent(content: string): string {
  const lines = content.split("\n")
  const maxNumberLength = lines.length.toString().length

  const numberedLines = lines.map((line, i) => {
    const lineNumber = i + 1
    const paddedNumber = lineNumber.toString().padStart(maxNumberLength, " ")
    return `${paddedNumber} | ${line}`
  })

  return numberedLines.join("\n")
}
