import { existsSync } from "fs"
import { lstat } from "fs/promises"

export interface ParsedArgs {
  path: string
  excludePatterns: string[]
  selectAll: boolean
  outputFile?: string
  exitAfterSave: boolean
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  let path = process.cwd()
  const excludePatterns: string[] = []
  let selectAll = false
  let outputFile: string | undefined
  let exitAfterSave = false
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (!arg) {
      i++
      continue
    }

    if (arg === "--exclude" || arg === "-e") {
      i++
      if (i < args.length) {
        const pattern = args[i]
        if (pattern !== undefined) {
          excludePatterns.push(pattern)
        }
      }
    } else if (arg.startsWith("--exclude=")) {
      const pattern = arg.substring(10)
      if (pattern !== undefined && pattern !== "") {
        excludePatterns.push(pattern)
      }
    } else if (arg.startsWith("-e=")) {
      const pattern = arg.substring(3)
      if (pattern !== undefined && pattern !== "") {
        excludePatterns.push(pattern)
      }
    } else if (arg === "--all" || arg === "-a") {
      selectAll = true
      // Проверяем следующий аргумент на наличие --exit
      if (i + 1 < args.length && (args[i + 1] === "--exit" || args[i + 1] === "-x")) {
        exitAfterSave = true
        i++ // Пропускаем --exit
      }
    } else if (arg === "--exit" || arg === "-x") {
      exitAfterSave = true
      // Если --exit указан без --all, то устанавливаем selectAll = true
      if (!selectAll) {
        selectAll = true
      }
    } else if (arg === "--output" || arg === "-o") {
      i++
      if (i < args.length) {
        outputFile = args[i]
      }
    } else if (arg.startsWith("--output=")) {
      outputFile = arg.substring(9)
    } else if (arg.startsWith("-o=")) {
      outputFile = arg.substring(3)
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    } else if (!arg.startsWith("-") && arg) {
      path = arg
    }

    i++
  }

  return { path, excludePatterns, selectAll, outputFile, exitAfterSave }
}

export async function validatePath(path: string): Promise<string> {
  if (existsSync(path)) {
    try {
      const stats = await lstat(path).catch(() => null)
      if (stats && stats.isDirectory()) {
        return path
      } else {
        console.log(`⚠️  "${path}" не является директорией. Использую текущую директорию.`)
      }
    } catch (error) {
      console.log(`⚠️  Не удалось проверить путь "${path}". Использую текущую директорию.`)
    }
  } else {
    console.log(`⚠️  Путь "${path}" не существует. Использую текущую директорию.`)
  }

  return process.cwd()
}

function showHelp(): void {
  console.log("🌳 Tree Explorer - интерактивный файловый менеджер\n")
  console.log("Использование:")
  console.log("  bun index.ts [путь] [опции]\n")
  console.log("Опции:")
  console.log("  --exclude, -e PATTERN  Исключить файлы по паттерну")
  console.log("  --all, -a              Выбрать все файлы (неинтерактивный режим)")
  console.log("  --exit, -x             Выйти после сохранения (только с --all)")
  console.log("  --output, -o FILE      Указать файл для сохранения результата")
  console.log("  --help, -h             Показать эту справку\n")
  console.log("Примеры:")
  console.log("  bun index.ts /path/to/dir")
  console.log('  bun index.ts -e "*.log" -e "node_modules"')
  console.log('  bun index.ts --all --output files.json')
  console.log('  bun index.ts --all --exit -o files.json')
  console.log('  bun index.ts --all -x -e "*.tmp" -e "node_modules"')
  console.log('  bun index.ts --exclude="temp*" --exclude="*.tmp"')
}
