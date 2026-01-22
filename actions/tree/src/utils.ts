/**
 * Находит общий корень для списка файлов
 */
export function getCommonRoot(files: string[]): string {
  if (files.length === 0) return process.cwd()

  const firstFile = files[0]!
  let commonParts = firstFile.split("/").filter(Boolean)

  for (const file of files.slice(1)) {
    const parts = file.split("/").filter(Boolean)
    let i = 0
    while (i < commonParts.length && i < parts.length && commonParts[i] === parts[i]) {
      i++
    }
    commonParts = commonParts.slice(0, i)
  }

  return commonParts.length > 0 ? `/${commonParts.join("/")}` : "/"
}