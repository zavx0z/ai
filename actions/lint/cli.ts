import rules from "../edit/edit.md" with {type: "text"}

import fs from "fs"
import path from "path"

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

// Функция для вывода цветного текста
function colorize(text: string, color: "green" | "yellow" | "red" | "blue" | "cyan" | "gray" = "gray") {
  const colors = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    reset: "\x1b[0m"
  }
  return `${colors[color]}${text}${colors.reset}`
}

// Функция для вывода статистики по файлам
function printFileStats(sortedStats: [string, number][], totalErrors: number) {
  console.log(`\n📊 ${colorize("Статистика ошибок по файлам:", "cyan")}`)
  
  if (sortedStats.length === 0) {
    console.log(`   ${colorize("✅ Нет ошибок в файлах", "green")}`)
    return
  }
  
  // Находим максимальную длину пути и максимальное количество ошибок
  const maxPathLength = Math.max(...sortedStats.map(([file]) => 
    path.relative(process.cwd(), file).length
  ))
  const maxErrors = Math.max(...sortedStats.map(([, count]) => count))
  
  sortedStats.forEach(([file, count], index) => {
    const relativePath = path.relative(process.cwd(), file)
    
    // Определяем цвет в зависимости от количества ошибок
    let fileColor: "green" | "yellow" | "red"
    if (count === 0) fileColor = "green"
    else if (count <= 3) fileColor = "yellow"
    else fileColor = "red"
    
    // Форматируем номер
    const numberStr = `${index + 1}.`.padStart(3, ' ')
    
    // Форматируем путь
    const pathStr = relativePath.padEnd(maxPathLength, ' ')
    
    // Форматируем текст с количеством ошибок (правильное склонение)
    const errorsText = count === 1 ? "ошибка" : 
                      count >= 2 && count <= 4 ? "ошибки" : "ошибок"
    const countStr = `${count} ${errorsText}`
    
    // Создаем график прогресс-бара (фиксированная длина 20 символов)
    const barLength = 20
    const filledLength = count === 0 ? 0 : Math.max(1, Math.round((count / maxErrors) * barLength))
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
    
    // Выводим с выравниванием - индикатор слева
    console.log(
      `   ${colorize(numberStr, "gray")} ` +
      `${colorize(pathStr, fileColor)} ` +
      `${colorize(countStr, fileColor)} ` +
      `${colorize(bar, fileColor)}`
    )
  })
  
  console.log(`\n   ${colorize("Всего файлов с ошибками:", "cyan")} ${colorize(sortedStats.length.toString(), "yellow")}`)
  console.log(`   ${colorize("Всего ошибок:", "cyan")} ${colorize(totalErrors.toString(), totalErrors > 0 ? "red" : "green")}`)
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
  console.log(`\n🚀 ${colorize(APP_NAME, "cyan")} - ${colorize("линтинг TypeScript файлов", "blue")}`)

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
    console.error(`${colorize("❌ Укажите путь к файлу или директории для линтинга", "red")}`)
    help()
    return // Вместо process.exit(1)
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
      console.log(`📖 ${colorize("Поиск TypeScript файлов:", "gray")} ${colorize(inputPath, "cyan")}`)
    }

    // Автоматически находим tsconfig если не указан явно
    if (!configFile) {
      configFile = (await findTsConfig(inputPath)) || undefined
      if (configFile && verbose) {
        console.log(`📋 ${colorize("Найден tsconfig:", "gray")} ${colorize(path.relative(process.cwd(), configFile), "cyan")}`)
      }
    }

    // 1. Получить файлы для проверки
    const files = await getFilesToLint(inputPath)

    if (files.length === 0) {
      console.log(`\n${colorize("🤷 Не найдено ни одного TypeScript файла для линтинга.", "yellow")}`)
      return // Вместо process.exit(0)
    }

    if (verbose) {
      console.log(`📄 ${colorize("Найдено файлов:", "gray")} ${colorize(files.length.toString(), "cyan")}`)
      files.forEach((file, i) => console.log(`  ${colorize((i + 1).toString(), "gray")}. ${colorize(path.relative(process.cwd(), file), "blue")}`))
    }

    // 2. Чтение содержимого каждого файла
    if (verbose) {
      console.log(`📖 ${colorize("Чтение файлов...", "gray")}`)
    }
    const filesWithContent: FileWithContent[] = await Promise.all(
      files.map(async (filePath) => ({
        path: filePath,
        content: await readFileContent(filePath),
      }))
    )

    // 3. Обработка
    if (verbose) {
      console.log(`🔄 ${colorize("Линтинг...", "gray")}`)
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

      // Чтение сохраненного результата и вывод статистики по ошибкам в файлах
      try {
        const diagnostics = JSON.parse(formattedResults)
        
        // Подсчет статистики по файлам
        const fileStats: Record<string, number> = {}
        diagnostics.forEach((diag: any) => {
          const file = diag.file
          fileStats[file] = (fileStats[file] || 0) + 1
        })
        
        // Сортировка по количеству ошибок (по убыванию)
        const sortedStats = Object.entries(fileStats)
          .sort(([, a], [, b]) => b - a)
        
        // Вывод красивой статистики
        printFileStats(sortedStats, results.summary.totalErrors)
      } catch (error) {
        console.log(`⚠️ ${colorize("Не удалось прочитать сохраненный результат:", "yellow")} ${error}`)
      }

      if (results.summary.totalErrors === 0) {
        await saveOutput(outputFile, "")
      } else {
        await saveOutput(outputFile, "Исправь ошибки \n" + formattedResults + "\n" + rules + "\n")
      }
      if (verbose) {
        console.log(`\n✅ ${colorize("Результат сохранён:", "green")} ${colorize(outputFile, "cyan")}`)
      }
      
    } else {
      // Выводим только JSON в stdout, без дополнительного текста
      console.log(formattedResults)
    }

    // 6. Сообщение о завершении (без установки кода ошибки)
    if (results.errors.length > 0) {
      console.log(`\n${colorize("ℹ️ Найдены ошибки в TypeScript файлах", "yellow")}`)
    } else if (verbose) {
      console.log(`\n${colorize("✅ Линтинг завершён успешно!", "green")}`)
    }
  } catch (error) {
    console.error(`${colorize("💥 Ошибка:", "red")} ${error instanceof Error ? error.message : String(error)}`)
    return // Вместо process.exit(1)
  }
}

if (import.meta.main) {
  await runCLI()
}