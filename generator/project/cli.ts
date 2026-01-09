#!/usr/bin/env bun

import { processEditRules, createFileSystemApplier } from "./index"

const APP_NAME = "File Editor"
const VERSION = "1.0.0"

function showHelp() {
  console.log(`
📝 ${APP_NAME} v${VERSION} - Редактирование файлов по JSON правилам

📋 Использование:
  bun run cli.ts <rules-json> [опции]

⚙️ Опции:
  -c, --check          🔍 Проверить правила без применения
  -v, --verbose        📊 Подробный вывод
  -h, --help           ❓ Справка

📝 Примеры:
  bun run cli.ts rules.json
  bun run cli.ts rules.json --check
  bun run cli.ts rules.json -v
`)
}

async function readRules(filePath: string): Promise<any> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      throw new Error(`Файл правил не найден: ${filePath}`)
    }
    return JSON.parse(await file.text())
  } catch (error) {
    throw new Error(`Ошибка чтения правил: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function runCLI() {
  console.log(`🚀 ${APP_NAME} v${VERSION}`)

  const args = Bun.argv.slice(2)

  // Help
  if (args.includes("-h") || args.includes("--help")) {
    showHelp()
    return
  }

  // Входной файл (первый позиционный аргумент)
  const inputIndex = args.findIndex((arg) => !arg.startsWith("-"))
  const inputFile = inputIndex !== -1 ? args[inputIndex] : null

  if (!inputFile) {
    console.error("❌ Укажите файл с правилами редактирования")
    showHelp()
    process.exit(1)
  }

  // Флаги
  const checkOnly = args.includes("-c") || args.includes("--check")
  const verbose = args.includes("-v") || args.includes("--verbose")

  try {
    console.log(`📖 Чтение правил из: ${inputFile}`)

    // Чтение и парсинг правил
    const rules = await readRules(inputFile)

    if (verbose) {
      console.log("🔍 Валидация правил...")
    }

    // Создаем апплайер для файловой системы
    const applyOperation = createFileSystemApplier()

    // Функция для чтения файлов
    const readFile = async (path: string): Promise<string> => {
      const file = Bun.file(path)
      if (!(await file.exists())) {
        throw new Error(`Файл не найден: ${path}`)
      }
      return await file.text()
    }

    if (checkOnly) {
      // Только проверка без применения
      console.log("🔍 Проверка правил...")
      const { validateEditRules } = await import("./src/validator")
      validateEditRules(rules)
      console.log("✅ Правила валидны!")
      console.log(`📋 Описание: ${rules.description}`)
      console.log(`📄 Файлов для изменения: ${rules.changes.length}`)

      if (verbose) {
        console.log("\n📋 Детали операций:")
        rules.changes.forEach((op: any, index: number) => {
          console.log(`  ${index + 1}. ${op.file} (${op.action})`)
        })
      }
    } else {
      // Применение изменений
      console.log("🔄 Применение изменений...")
      await processEditRules(rules, readFile, applyOperation)
      console.log("\n🎉 Все изменения успешно применены!")
    }
  } catch (error) {
    console.error("💥 Ошибка:", error instanceof Error ? error.message : String(error))
    if (verbose && error instanceof Error && error.stack) {
      console.error("\n📄 Stack trace:", error.stack)
    }
    process.exit(1)
  }
}

if (import.meta.main) {
  await runCLI()
}
