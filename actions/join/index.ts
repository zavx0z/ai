import { extname } from "node:path"
import { readFileList, checkFilesExist, readJsonFileList } from "./src/file"
import { createFileTree } from "../tree/index"

// Языки для блоков кода
const LANGUAGES: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".wgsl": "wgsl",
  ".html": "html",
  ".css": "css",
  ".json": "json",
  ".md": "markdown",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".txt": "text",
  ".gitignore": "text",
  ".env": "text",
  ".tsconfig": "json",
  ".tsconfig.json": "json",
}

interface FileEntry {
  path: string
  content?: string
  skip?: boolean
}

/**
 * Собирает контекст из списка файлов
 */
export async function createContextFromFileList(options: { fileListPath: string }): Promise<string> {
  const { fileListPath } = options

  console.log(`📖 Чтение списка файлов из ${fileListPath}...`)

  // Определяем формат файла по расширению
  const fileListExt = extname(fileListPath).toLowerCase() // Переименовано во избежание конфликта
  let files: string[] = []
  let fileEntries: FileEntry[] = []

  if (fileListExt === ".json") {
    // JSON формат
    fileEntries = await readJsonFileList(fileListPath)
    files = fileEntries.map((entry) => entry.path)
    console.log(`📁 Найдено ${fileEntries.length} записей в JSON файле`)
  } else {
    // Текстовый формат (старый)
    files = await readFileList(fileListPath)
    console.log(`📁 Найдено ${files.length} файлов в списке`)
  }

  // Проверяем существование файлов (только для текстового формата)
  let existingFiles: string[] = []
  let missingFiles: string[] = []

  if (fileListExt !== ".json") {
    const result = await checkFilesExist(files)
    existingFiles = result.existingFiles
    missingFiles = result.missingFiles

    if (missingFiles.length > 0) {
      console.warn(`⚠️  Предупреждение: ${missingFiles.length} файлов не найдено`)
      if (missingFiles.length <= 10) {
        missingFiles.forEach((file) => console.warn(`  - ${file}`))
      } else {
        console.warn(`  Первые 10 файлов: ${missingFiles.slice(0, 10).join(", ")}...`)
      }
    }
  } else {
    existingFiles = files
  }

  const sections: string[] = []

  // Добавляем дерево проекта в начале
  if (existingFiles.length > 0) {
    sections.push("# Проект\n")
    sections.push(createFileTree(existingFiles))
    sections.push("")
  }

  // Добавляем содержимое файлов
  for (let i = 0; i < existingFiles.length; i++) {
    const filePath = existingFiles[i]!
    const fileEntry = fileEntries[i]

    // Для JSON формата проверяем флаг skip
    if (fileListExt === ".json" && fileEntry?.skip) {
      console.log(`⏭️  Пропущен файл: ${filePath}`)
      continue
    }

    try {
      let content: string

      // Для JSON формата берем контент из записи или читаем файл
      if (fileListExt === ".json" && fileEntry?.content !== undefined) {
        content = fileEntry.content!
      } else {
        const file = Bun.file(filePath)
        if (!file) {
          throw new Error(`Файл не найден: ${filePath}`)
        }
        content = await file.text()
      }

      const fileExt = extname(filePath).toLowerCase() // Переименовано
      const language = LANGUAGES[fileExt] || "text"

      sections.push(`\`\`\`${language} ${filePath}`)
      sections.push(content)
      sections.push(`\`\`\``)
      sections.push("")
    } catch (error) {
      console.warn(`⚠️  Ошибка чтения файла ${filePath}:`, error instanceof Error ? error.message : String(error))
      sections.push(`# ❌ ${filePath}\n`)
      sections.push(`Не удалось прочитать файл\n\n`)
    }
  }

  const result = sections.join("\n")

  console.log(`✅ Собрано ${existingFiles.length} файлов`)
  console.log(`📊 Размер: ${(result.length / 1024).toFixed(2)} KB`)

  if (missingFiles.length > 0) {
    console.log(`⚠️  Пропущено: ${missingFiles.length} файлов`)
  }
  return result
}
