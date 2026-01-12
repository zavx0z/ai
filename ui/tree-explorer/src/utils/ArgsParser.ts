import { existsSync } from "fs"
import { lstat } from "fs/promises"

export interface ParsedArgs {
  path: string
  excludePatterns: string[]
  pipelineMode: boolean
  outputFile?: string
  inputFile?: string
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  let path = process.cwd()
  const excludePatterns: string[] = []
  let pipelineMode = false
  let outputFile: string | undefined
  let inputFile: string | undefined
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
    } else if (arg === "--pipeline" || arg === "-p") {
      pipelineMode = true
    } else if (arg === "--output" || arg === "-o") {
      i++
      if (i < args.length) {
        outputFile = args[i]
      }
    } else if (arg.startsWith("--output=")) {
      outputFile = arg.substring(9)
    } else if (arg.startsWith("-o=")) {
      outputFile = arg.substring(3)
    } else if (arg === "--input" || arg === "-i") {
      i++
      if (i < args.length) {
        inputFile = args[i]
      }
    } else if (arg.startsWith("--input=")) {
      inputFile = arg.substring(8)
    } else if (arg.startsWith("-i=")) {
      inputFile = arg.substring(3)
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    } else if (!arg.startsWith("-") && arg) {
      path = arg
    }

    i++
  }

  return { path, excludePatterns, pipelineMode, outputFile, inputFile }
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
  console.log("  --pipeline, -p         Режим пайплайна: выбрать всё, сохранить и выйти")
  console.log("  --output, -o FILE      Указать файл для сохранения результата")
  console.log("  --input, -i FILE       Указать JSON файл с начальным выбором")
  console.log("  --help, -h             Показать эту справку\n")
  console.log("Примеры:")
  console.log("  bun index.ts /path/to/dir")
  console.log('  bun index.ts -e "*.log" -e "node_modules"')
  console.log('  bun index.ts --pipeline --output files.json')
  console.log('  bun index.ts -p -o files.json -e "*.tmp" -e "node_modules"')
  console.log('  bun index.ts --exclude="temp*" --exclude="*.tmp"')
}
