import { createContextFromFileList } from "./index"

/**
 * Вывод справки
 */
function printHelp(): void {
  console.log(`
📚 AI Context Project

Использование:
  bun cli.ts <путь-к-файлу> [опции]

Аргументы:
  <путь-к-файлу>         Путь к текстовому файлу со списком файлов
                          (каждый файл на новой строке)

Опции:
  -f, --file <путь>      Путь к файлу со списком файлов
  -o, --output <путь>    Путь к выходному файлу (по умолчанию: ai-documentation.md)
  --no-numbers           Отключить нумерацию строк
  --exclude-numbers <расширения>
                         Расширения файлов без нумерации (через запятую)
                          (по умолчанию: .md,.mdx,.txt,.json,.yaml,.yml,.env,.gitignore)
  -h, --help             Показать эту справку
  -v, --version          Показать версию

Примеры:
  # Базовое использование
  bun cli.ts files.txt
  
  # С указанием выходного файла
  bun cli.ts --file files.txt --output docs/project.md
  
  # Без нумерации строк
  bun cli.ts files.txt --no-numbers
  
  # С кастомными исключениями нумерации
  bun cli.ts files.txt --exclude-numbers .txt,.json

Формат файла со списком:
  Каждый файл на новой строке
  Пути могут быть абсолютными или относительными
  Пустые строки и строки начинающиеся с # игнорируются

Пример файла files.txt:
  /path/to/project/src/main.ts
  /path/to/project/src/utils.ts
  # Это комментарий
  /path/to/project/README.md
`)
}

/**
 * CLI интерфейс
 */
export async function runCLI(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp()
    return
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log("ai-documentation-generator v1.0.0 (Bun)")
    return
  }

  // Парсим аргументы
  const options: {
    fileListPath?: string
    outputFile?: string
    addLineNumbers?: boolean
    excludeLineNumbers?: string[]
  } = {}

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (!arg) {
      i++
      continue
    }

    if (arg === "--file" || arg === "-f") {
      options.fileListPath = args[i + 1]
      i += 2
    } else if (arg === "--output" || arg === "-o") {
      options.outputFile = args[i + 1]
      i += 2
    } else if (arg === "--no-numbers") {
      options.addLineNumbers = false
      i += 1
    } else if (arg === "--exclude-numbers") {
      const exclusions = args[i + 1]?.split(",") || []
      options.excludeLineNumbers = exclusions
      i += 2
    } else if (!arg.startsWith("-")) {
      // Если первый аргумент не флаг, считаем его путем к файлу
      if (!options.fileListPath) {
        options.fileListPath = arg
      }
      i += 1
    } else {
      console.warn(`Неизвестный аргумент: ${arg}`)
      i += 1
    }
  }

  // Проверяем обязательный аргумент
  if (!options.fileListPath) {
    console.error("❌ Ошибка: необходимо указать путь к файлу со списком файлов")
    printHelp()
    process.exit(1)
  }

  try {
    const result = await createContextFromFileList({
      fileListPath: options.fileListPath,
      addLineNumbers: options.addLineNumbers,
      excludeLineNumbers: options.excludeLineNumbers,
    })
    await Bun.write(options.outputFile || "./tmp/output.md", result)
    console.log(`✅ Результат успешно записан в файл ${options.outputFile || "./tmp/output.md"}:`)
  } catch (error) {
    console.error(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// Автозапуск если файл запущен напрямую
if (import.meta.main) {
  await runCLI()
}
