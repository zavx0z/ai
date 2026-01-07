#!/usr/bin/env bun
import { CommentRemover } from "./index"
import type { RemovalOptions } from "./index.t"

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === "--help" || command === "-h") {
    showHelp()
    return
  }

  try {
    switch (command) {
      case "clean":
        await handleCleanCommand(args.slice(1))
        break

      case "restore":
        await handleRestoreCommand(args.slice(1))
        break

      case "stats":
        await handleStatsCommand(args.slice(1))
        break

      default:
        console.error(`Неизвестная команда: ${command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error("❌ Ошибка:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

async function handleCleanCommand(args: string[]) {
  const options: RemovalOptions = {}
  let sourcePath = ""
  let outputPath: string | undefined
  let metadataPath: string | undefined

  // Парсим аргументы
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--compact":
        options.preserveNewlines = false
        break

      case "--keep-jsdoc":
        options.keepOnly = ["jsdoc"]
        break

      case "--remove-only":
        if (args[i + 1]) {
          const types = args[i + 1]!.split(",").map((t) => t.trim()) as any[]
          options.removeOnly = types
          i++
        }
        break

      case "--output":
        outputPath = args[++i]
        break

      case "--metadata":
        metadataPath = args[++i]
        break

      case "--no-shebang":
        options.includeShebang = false
        break

      default:
        if (arg && !arg.startsWith("--") && !sourcePath) {
          sourcePath = arg!
        }
        break
    }
  }

  if (!sourcePath) {
    console.error("❌ Укажите путь к исходному файлу")
    showHelp()
    process.exit(1)
  }

  console.log(`🧹 Очищаем комментарии из: ${sourcePath}`)

  const metadata = await CommentRemover.saveCleanedCode(sourcePath, outputPath, metadataPath, options)

  const stats = CommentRemover.getCommentStats(metadata.comments)

  console.log("✅ Готово!")
  console.log(`📄 Очищенный файл: ${metadata.cleanedFile}`)
  console.log(`📊 Метаданные: ${metadataPath || sourcePath.replace(/\.(ts|js|tsx|jsx)$/, ".comments.json")}`)
  console.log("\n📈 Статистика:")
  console.log(`   Всего комментариев: ${stats.total}`)
  console.log(`   Однострочных: ${stats.byType["single-line"]}`)
  console.log(`   Многострочных: ${stats.byType["multi-line"]}`)
  console.log(`   JSDoc/Typedoc: ${stats.byType["jsdoc"]}`)
  console.log(`   Строк с комментариями: ${stats.linesWithComments}`)
  console.log(`   Общий размер комментариев: ${stats.totalCommentLength} символов`)
}

async function handleRestoreCommand(args: string[]) {
  let cleanedPath: string | undefined
  let metadataPath: string | undefined
  let outputPath: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--cleaned":
        cleanedPath = args[++i]
        break

      case "--metadata":
        metadataPath = args[++i]
        break

      case "--output":
        outputPath = args[++i]
        break

      default:
        if (arg && !arg.startsWith("--")) {
          if (!cleanedPath) {
            cleanedPath = arg
          } else if (!metadataPath) {
            metadataPath = arg
          }
        }
        break
    }
  }

  if (!cleanedPath || !metadataPath) {
    console.error("❌ Укажите пути к очищенному файлу и файлу метаданных")
    showHelp()
    process.exit(1)
  }

  console.log(`🔧 Восстанавливаем комментарии из: ${metadataPath}`)

  const restoredCode = await CommentRemover.restoreFromMetadata(cleanedPath, metadataPath)

  const finalOutput = outputPath || cleanedPath.replace(".clean.", ".restored.")
  await Bun.write(finalOutput, restoredCode)

  console.log("✅ Готово!")
  console.log(`📄 Восстановленный файл: ${finalOutput}`)
}

async function handleStatsCommand(args: string[]) {
  const filePath = args[0]

  if (!filePath) {
    console.error("❌ Укажите путь к файлу")
    showHelp()
    process.exit(1)
  }

  const sourceCode = await Bun.file(filePath).text()
  const metadata = CommentRemover.collectComments(sourceCode, filePath)
  const stats = CommentRemover.getCommentStats(metadata)

  console.log(`📊 Статистика комментариев для: ${filePath}`)
  console.log(`\nВсего комментариев: ${stats.total}`)
  console.log(`Однострочных: ${stats.byType["single-line"]}`)
  console.log(`Многострочных: ${stats.byType["multi-line"]}`)
  console.log(`JSDoc/Typedoc: ${stats.byType["jsdoc"]}`)
  console.log(`Строк с комментариями: ${stats.linesWithComments}`)
  console.log(`Общий размер комментариев: ${stats.totalCommentLength} символов`)
  console.log(`Процент комментариев: ${((stats.totalCommentLength / sourceCode.length) * 100).toFixed(2)}%`)

  // Топ 5 самых длинных комментариев
  if (metadata.length > 0) {
    console.log("\n🏆 Топ-5 самых длинных комментариев:")
    const sortedByLength = [...metadata].sort((a, b) => b.text.length - a.text.length).slice(0, 5)

    sortedByLength.forEach((comment, index) => {
      const preview = comment.text.length > 100 ? comment.text.substring(0, 100) + "..." : comment.text
      console.log(`  ${index + 1}. Строка ${comment.line}, ${comment.type}, ${comment.text.length} символов:`)
      console.log(`     ${preview.replace(/\n/g, "\n     ")}`)
    })
  }
}

function showHelp() {
  console.log(`
Comment Remover - Удаление и восстановление комментариев через AST

Использование:
  bun run cli.ts <command> [options]

Команды:
  clean <file>          - Удалить комментарии из файла
  restore <cleaned> <metadata> - Восстановить комментарии
  stats <file>          - Показать статистику комментариев

Опции для clean:
  --output <path>       - Путь для очищенного файла
  --metadata <path>     - Путь для файла метаданных
  --compact             - Сжать код (удалить пустые строки)
  --keep-jsdoc          - Сохранять только JSDoc комментарии
  --remove-only <types> - Удалять только указанные типы (через запятую)
  --no-shebang          - Не сохранять shebang

Опции для restore:
  --cleaned <path>      - Путь к очищенному файлу
  --metadata <path>     - Путь к файлу метаданных
  --output <path>       - Путь для восстановленного файла

Примеры:
  bun run cli.ts clean src/index.ts
  bun run cli.ts clean src/index.ts --compact --output dist/index.js
  bun run cli.ts restore dist/index.clean.js dist/index.comments.json
  bun run cli.ts stats src/index.ts
  `)
}

if (import.meta.main) {
  main()
}
