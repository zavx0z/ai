#!/usr/bin/env bun

import { CommentRemover } from "./index"
import type { CommentType } from "./index.t"
import { createFileTree } from "../tree/index"

async function main() {
  const args = Bun.argv.slice(2)

  // Проверка обязательных аргументов
  if (args.length < 2) {
    console.error("Использование: bun run clean-files.ts <files.json> --output <output.md>")
    console.error("Пример: bun run clean-files.ts files.json --output result.md")
    console.error("\nОписание:")
    console.error("  files.json - путь к JSON-файлу с массивом абсолютных путей к файлам")
    console.error("  --output   - путь к выходному Markdown-файлу")
    console.error("\nПример files.json:")
    console.error("  [")
    console.error('    \"/путь/к/файлу1.ts\",')
    console.error('    \"/путь/к/файлу2.js\"')
    console.error("  ]")
    process.exit(1)
  }

  const filesJsonPath = args[0]
  const outputIndex = args.indexOf("--output")

  if (outputIndex === -1 || outputIndex + 1 >= args.length) {
    console.error("Ошибка: не указан --output файл")
    console.error("Использование: bun run clean-files.ts <files.json> --output <output.md>")
    process.exit(1)
  }

  const outputPath = args[outputIndex + 1]

  // Чтение files.json
  let filePaths: string[]
  try {
    if (!filesJsonPath) {
      console.error("filesJsonPath is undefined")
      return
    }
    const filesJsonFile = Bun.file(filesJsonPath)
    const filesJsonContent = await filesJsonFile.text()
    filePaths = JSON.parse(filesJsonContent)

    if (!Array.isArray(filePaths)) {
      throw new Error("files.json должен содержать массив путей к файлам")
    }
  } catch (error) {
    console.error(`❌ Ошибка при чтении files.json: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  console.log(`📁 Найдено файлов для обработки: ${filePaths.length}`)
  console.log(`📄 Входной файл: ${filesJsonPath}`)
  console.log(`📝 Выходной файл: ${outputPath}`)
  console.log("🚀 Начинаем обработку...\n")

  const processedFiles: string[] = []
  const skippedFiles: string[] = []
  let markdownContent = ""

  // Обработка каждого файла
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]
    console.log(`[${i + 1}/${filePaths.length}] Обработка: ${filePath}`)

    try {
      // Проверка существования файла
      if (!filePath) {
        console.error("filePath is undefined")
        continue
      }
      const currentFile = Bun.file(filePath)
      if (!(await currentFile.exists())) {
        console.warn(`  ⚠️  Файл не найден, пропускаем`)
        if (filePath)
          if (filePath) {
            if (filePath) skippedFiles.push(filePath)
          }
        continue
      }

      const sourceCode = await currentFile.text()

      // Используем CommentRemover для удаления комментариев
      const result = await CommentRemover.cleanCode(sourceCode, filePath, {
        includeShebang: true,
        preserveNewlines: true,
        removeOnly: ["single-line", "multi-line", "jsdoc"] as CommentType[], // Удаляем все типы комментариев
      })

      // Сжимаем множественные пустые строки: 2+ пустых строк -> 1 пустая строка
      const lines = result.cleanedCode.split("\n")
      const newLines: string[] = []
      let previousLineWasEmpty = false

      for (const line of lines) {
        const trimmed = line.trim()
        const isEmpty = trimmed === ""

        if (isEmpty && previousLineWasEmpty) {
          continue // Пропускаем дополнительные пустые строки
        }

        newLines.push(line)
        previousLineWasEmpty = isEmpty
      }

      const finalCode = newLines.join("\n")

      // Определение языка для подсветки по расширению файла
      const extension = filePath.split(".").pop()?.toLowerCase()
      let language = extension || "text"

      // Специальные случаи для TypeScript/JavaScript
      if (language === "ts" || language === "tsx") language = "typescript"
      if (language === "js" || language === "jsx") language = "javascript"
      if (language === "md") language = "markdown"
      if (language === "py") language = "python"
      if (language === "rb") language = "ruby"
      if (language === "java") language = "java"
      if (language === "cpp" || language === "cc" || language === "cxx") language = "cpp"
      if (language === "c") language = "c"
      if (language === "go") language = "go"
      if (language === "rs") language = "rust"
      if (language === "php") language = "php"

      // Добавление блока кода в Markdown
      markdownContent += `\`\`\`${language} ${filePath}\n${finalCode}\n\`\`\`\n\n`

      if (filePath) processedFiles.push(filePath)
      console.log(`  ✅ Обработан (${language})`)
    } catch (error) {
      console.error(`  ❌ Ошибка при обработке файла: ${error instanceof Error ? error.message : String(error)}`)
      skippedFiles.push(filePath!)
    }
  }

  // Запись выходного файла
  try {
    // Добавляем дерево файлов в начало отчета
    if (processedFiles.length > 0) {
      console.log("🌳 Генерация дерева файлов...")
      const tree = createFileTree(processedFiles)
      markdownContent = `# Структура файлов\n\n${tree}\n\n---\n\n${markdownContent}`
    }

    if (outputPath) await Bun.write(outputPath, markdownContent)

    // Вывод статистики
    console.log("\n✅ Готово!")
    console.log(`📄 Выходной файл: ${outputPath}`)
    console.log(`📊 Статистика:`)
    console.log(`   Обработано файлов: ${processedFiles.length}`)
    console.log(`   Пропущено файлов: ${skippedFiles.length}`)

    if (skippedFiles.length > 0) {
      console.log(`\n⚠️  Пропущенные файлы:`)
      skippedFiles.forEach((file) => console.log(`   - ${file}`))
    }

    console.log("\n📋 Результат:")
    console.log(`   Создан Markdown-файл с ${processedFiles.length} блоками кода.`)
    console.log(`   Файл ${outputPath} можно открыть в любом Markdown-редакторе.`)
  } catch (error) {
    console.error(`❌ Ошибка при записи выходного файла: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}
