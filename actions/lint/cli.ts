import rules from "./rules.md" with {type: "text"}

import fs from "fs"
import path from "path"
// console.log(rules)
const APP_NAME = "TS-Linter"

function help() {
  console.log(`
📋 ${APP_NAME} - линтинг TypeScript файлов

🚀 Использование:
  bun run cli.ts <путь> [опции]

⚙️ Опции:
  -o, --output <путь>        📁 Сохранить результат в файл
  -v, --verbose              🔍 Подробный вывод
  -h, --help                 ❓ Справка
  -s, --strict               🔒 Строгий режим линтинга
  -c, --config <путь>        ⚙️  Путь к tsconfig.json

📝 Примеры:
  bun run cli.ts ./src              # Проверить директорию
  bun run cli.ts ./src/index.ts     # Проверить конкретный файл
  bun run cli.ts ./src --output lint-report.json
  bun run cli.ts ./src --verbose --strict
  bun run cli.ts ./src -o report.json -c ./tsconfig.json
`)
}

async function findTsConfig(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir)

  // Если передан файл, начинаем с его директории
  if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
    currentDir = path.dirname(currentDir)
  }

  while (currentDir !== path.parse(currentDir).root) {
    const tsconfigPath = path.join(currentDir, "tsconfig.json")

    try {
      if (fs.existsSync(tsconfigPath)) {
        return tsconfigPath
      }
    } catch (error) {
      // Продолжаем поиск
    }

    currentDir = path.dirname(currentDir)
  }

  return null
}

async function getFilesToLint(inputPath: string): Promise<string[]> {
  const normalizedPath = path.resolve(inputPath)

  try {
    const stat = fs.statSync(normalizedPath)

    if (stat.isFile()) {
      // Если передан файл - проверяем только его
      const ext = path.extname(normalizedPath)
      if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) {
        return [normalizedPath]
      } else {
        throw new Error(`Не TypeScript файл: ${inputPath}`)
      }
    }

    // Если передан путь к директории - ищем все TS файлы рекурсивно
    return await readDirectoryFiles(normalizedPath)
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      throw new Error(`Путь не найден: ${inputPath}`)
    }
    throw error
  }
}

async function readDirectoryFiles(dirPath: string): Promise<string[]> {
  const files: string[] = []

  function walk(currentPath: string) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          // Пропускаем node_modules, .git и другие служебные директории
          if (entry.name === "node_modules" || entry.name.startsWith(".")) {
            continue
          }
          walk(fullPath)
        } else {
          const ext = path.extname(entry.name)
          if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Ошибка чтения директории ${currentPath}: ${error}`)
    }
  }

  walk(dirPath)
  return files
}

async function readFileContent(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      throw new Error(`Файл не найден: ${filePath}`)
    }
    return await file.text()
  } catch (error) {
    throw new Error(`Ошибка чтения файла ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function saveOutput(filePath: string, content: string): Promise<void> {
  try {
    await Bun.write(filePath, content)
  } catch (error) {
    throw new Error(`Ошибка записи файла: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Добавляем интерфейс для файлов с контентом
interface FileWithContent {
  path: string
  content: string
}

export async function runCLI() {
  console.error(`🚀 ${APP_NAME} - линтинг TypeScript файлов\n`)

  const args = Bun.argv.slice(2)

  // Help
  if (args.includes("-h") || args.includes("--help")) {
    help()
    return
  }

  // Входной путь (первый позиционный аргумент)
  const inputIndex = args.findIndex((arg) => !arg.startsWith("-"))
  const inputPath = inputIndex !== -1 ? args[inputIndex] : null

  if (!inputPath) {
    console.error("❌ Укажите путь к файлу или директории для линтинга")
    help()
    process.exit(1)
  }

  // Флаги вывода
  const outputIndex = args.findIndex((arg) => arg === "-o" || arg === "--output")
  const outputFile = outputIndex !== -1 && args[outputIndex + 1] ? args[outputIndex + 1] : null

  // Другие флаги
  const verbose = args.includes("-v") || args.includes("--verbose")
  const strict = args.includes("-s") || args.includes("--strict")

  // Конфиг
  const configIndex = args.findIndex((arg) => arg === "-c" || arg === "--config")
  let configFile = configIndex !== -1 && args[configIndex + 1] ? args[configIndex + 1] : undefined

  try {
    if (verbose) {
      console.error(`📖 Поиск TypeScript файлов: ${inputPath}`)
    }

    // Автоматически находим tsconfig если не указан явно
    if (!configFile) {
      configFile = (await findTsConfig(inputPath)) || undefined
      if (configFile && verbose) {
        console.error(`📋 Найден tsconfig: ${path.relative(process.cwd(), configFile)}`)
      }
    }

    // 1. Получить файлы для проверки
    const files = await getFilesToLint(inputPath)

    if (files.length === 0) {
      console.error("🤷 Не найдено ни одного TypeScript файла для линтинга.")
      process.exit(0)
    }

    if (verbose) {
      console.error(`📄 Найдено файлов: ${files.length}`)
      files.forEach((file, i) => console.error(`  ${i + 1}. ${path.relative(process.cwd(), file)}`))
    }

    // 2. Чтение содержимого каждого файла
    if (verbose) {
      console.error("📖 Чтение файлов...")
    }
    const filesWithContent: FileWithContent[] = await Promise.all(
      files.map(async (filePath) => ({
        path: filePath,
        content: await readFileContent(filePath),
      }))
    )

    // 3. Обработка
    if (verbose) {
      console.error("🔄 Линтинг...")
    }
    const { lintFiles } = await import("./index")
    const results = await lintFiles(filesWithContent, {
      strict,
      verbose,
      tsconfigPath: configFile,
    })

    // 4. Форматирование результатов
    const { formatLintResults } = await import("./src/formatter")
    const formattedResults = formatLintResults(results, { verbose })

    // 5. Вывод результата
    if (outputFile) {
      await saveOutput(outputFile, formattedResults)
      if (verbose) {
        console.error(`\n✅ Результат сохранён: ${outputFile}`)
      }
    } else {
      // Выводим только JSON в stdout, без дополнительного текста
      console.log(formattedResults)
    }

    // 6. Выходной код (только в stderr, чтобы не мешать JSON)
    if (results.errors.length > 0) {
      if (verbose) {
        console.error("\n❌ Найдены ошибки в TypeScript файлах")
      }
      process.exitCode = 1
    } else if (verbose) {
      console.error("\n✅ Линтинг завершён успешно!")
    }
  } catch (error) {
    console.error("💥 Ошибка:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

if (import.meta.main) {
  await runCLI()
}