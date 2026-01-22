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
 * Читает список файлов из JSON файла
 */
export async function readJsonFileList(filePath: string): Promise<Array<{ path: string; content?: string; skip?: boolean }>> {
  try {
    const content = await Bun.file(filePath).text()
    const data = JSON.parse(content)
    
    // Поддерживаем оба формата: массив строк или массив объектов
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === "string") {
          return { path: item }
        } else if (item && typeof item === "object" && "path" in item) {
          return {
            path: item.path,
            content: item.content,
            skip: item.skip
          }
        }
        throw new Error(`Некорректный формат записи: ${JSON.stringify(item)}`)
      })
    }
    
    throw new Error("JSON файл должен содержать массив")
  } catch (error) {
    throw new Error(`Не удалось прочитать JSON файл ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
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
