import { extname } from "path"
import { readFileList, checkFilesExist } from "./src/file"
import { createFileTree } from "./src/tree"

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

/**
 * Собирает контекст из списка файлов
 */
export async function createContextFromFileList(options: {
  fileListPath: string
}): Promise<string> {
  const {
    fileListPath,
  } = options

  console.log(`📖 Чтение списка файлов из ${fileListPath}...`)
  const files = await readFileList(fileListPath)

  console.log(`📁 Найдено ${files.length} файлов в списке`)

  // Проверяем существование файлов
  const { existingFiles, missingFiles } = await checkFilesExist(files)

  if (missingFiles.length > 0) {
    console.warn(`⚠️  Предупреждение: ${missingFiles.length} файлов не найдено`)
    if (missingFiles.length <= 10) {
      missingFiles.forEach((file) => console.warn(`  - ${file}`))
    } else {
      console.warn(`  Первые 10 файлов: ${missingFiles.slice(0, 10).join(", ")}...`)
    }
  }

  const sections: string[] = []

  // Добавляем дерево проекта в начале
  if (existingFiles.length > 0) {
    sections.push("# Проект\n")
    sections.push(createFileTree(existingFiles))
    sections.push("")
  }

  // Добавляем содержимое файлов
  for (const filePath of existingFiles) {
    try {
      const file = Bun.file(filePath)
      const content = await file.text()
      const ext = extname(filePath).toLowerCase()
      const language = LANGUAGES[ext] || "text"

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
