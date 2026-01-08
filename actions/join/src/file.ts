/**
 * Читает список файлов из текстового файла
 */
export async function readFileList(filePath: string): Promise<string[]> {
  try {
    const content = await Bun.file(filePath).text()
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  } catch (error) {
    throw new Error(`Не удалось прочитать файл ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Проверяет существование файлов в списке
 */
export async function checkFilesExist(files: string[]): Promise<{ existingFiles: string[]; missingFiles: string[] }> {
  const existingFiles: string[] = []
  const missingFiles: string[] = []

  for (const file of files) {
    try {
      const fileInfo = Bun.file(file)
      const exists = await fileInfo.exists()
      if (exists) {
        existingFiles.push(file)
      } else {
        missingFiles.push(file)
      }
    } catch (error) {
      missingFiles.push(file)
    }
  }

  return { existingFiles, missingFiles }
}

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
