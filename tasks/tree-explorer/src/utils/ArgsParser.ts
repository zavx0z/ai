import { existsSync } from "fs"
import { lstat } from "fs/promises"

export interface ParsedArgs {
  path: string
  excludePatterns: string[]
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  let path = process.cwd()
  const excludePatterns: string[] = []
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === "--exclude" || arg === "-e") {
      i++
      if (i < args.length) {
        excludePatterns.push(args[i])
      }
    } else if (arg.startsWith("--exclude=")) {
      excludePatterns.push(arg.substring(10))
    } else if (arg.startsWith("-e=")) {
      excludePatterns.push(arg.substring(3))
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    } else if (!arg.startsWith("-")) {
      path = arg
    }

    i++
  }

  return { path, excludePatterns }
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
  console.log("  --help, -h             Показать эту справку\n")
  console.log("Примеры:")
  console.log("  bun index.ts /path/to/dir")
  console.log('  bun index.ts -e "*.log" -e "node_modules"')
  console.log('  bun index.ts --exclude="temp*" --exclude="*.tmp"')
}
