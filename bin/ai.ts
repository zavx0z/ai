#!/usr/bin/env bun
import { join, resolve, dirname } from "path"
import { readdir } from "node:fs/promises"
import { fileURLToPath } from "url"

// ==========================================
// 🛠 НАСТРОЙКА ПУТЕЙ
// ==========================================

const __filename = fileURLToPath(import.meta.url)
const AI_ROOT = resolve(dirname(__filename), "..")
const Tool = (path: string) => `"${join(AI_ROOT, path)}"`

// ==========================================
// 🏗 БАЗОВЫЕ КОМАНДЫ
// ==========================================

const CMD_FILES = `bun run ${Tool(
  "tasks/tree-explorer/index.ts"
)} -e node_modules -e tmp -e .git -e .vscode -p -o tmp/files.json`

const CMD_JOIN = `bun run ${Tool("actions/join/cli.ts")} --file tmp/files.json --output tmp/join.md`

const CHAIN_GEN_CONTEXT = `${CMD_FILES} && ${CMD_JOIN}`

// ==========================================
// ⚙️ КОНФИГУРАЦИЯ
// ==========================================

const CONFIG_FILENAME = "zavx0z.yaml"
const DEFAULT_CONFIG_CONTENT = `# zavx0z.yaml - Конфигурация проекта/пакета
# Создано автоматически AI-CLI

# Настройки для Tree Explorer (пример)
# outputFile: ./tmp/files.json
exclude:
  - node_modules
  - dist
  - .git
  - .vscode
  - zavx0z.yaml

# Настройки для генератора коммитов
# contextFile: ./tmp/join.md
`

/**
 * Проверяет и создает файл конфигурации в целевой директории
 */
async function ensureConfigFile(dirPath: string) {
  const configPath = join(dirPath, CONFIG_FILENAME)
  const file = Bun.file(configPath)
  
  if (!(await file.exists())) {
    try {
      await Bun.write(configPath, DEFAULT_CONFIG_CONTENT)
      // Мы не выводим лог в консоль здесь, чтобы не ломать TUI меню,
      // так как эта функция вызывается между отрисовками меню.
    } catch (e) {
      // Игнорируем ошибки тихо или пишем в stderr
    }
  }
}

// ==========================================
// 📋 СПИСОК ИНСТРУМЕНТОВ
// ==========================================

interface ToolDefinition {
  id: string
  name: string
  description: string
  getCommand: () => string
}

const TOOLS: ToolDefinition[] = [
  {
    id: "files",
    name: "📂 Files JSON",
    description: "Сканирование файлов в tmp/files.json",
    getCommand: () => `mkdir -p tmp && ${CMD_FILES}`,
  },
  {
    id: "join",
    name: "📝 Context (Join)",
    description: "Генерация tmp/join.md (Files + Tree)",
    getCommand: () => `mkdir -p tmp && ${CHAIN_GEN_CONTEXT}`,
  },
  {
    id: "lint",
    name: "🧹 Lint",
    description: "Линтинг + Контекст (join >> lint.md)",
    getCommand: () => {
      const cmdLint = `bun run ${Tool("actions/lint/cli.ts")} . -o tmp/lint.md`
      const cmdAppend = `cat tmp/join.md >> tmp/lint.md`
      return `mkdir -p tmp && ${CHAIN_GEN_CONTEXT} && ${cmdLint} && ${cmdAppend}`
    },
  },
  {
    id: "edit-context",
    name: "🤖 Edit Context",
    description: "Подготовка контекста для редактирования (edit.md)",
    getCommand: () => {
      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const cmdConcat = `cat tmp/join.md ${docBun} ${docEdit} > tmp/edit.md`
      const cmdCopy = `cat tmp/edit.md | pbcopy`
      const cmdNotify = `echo "✅ Текст скопирован в буфер обмена!"`
      return `mkdir -p tmp && ${CHAIN_GEN_CONTEXT} && ${cmdConcat} && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "edit",
    name: "🔨 Apply Edit",
    description: "Применить изменения из tmp/edit.json",
    getCommand: () => {
      const cmdCopy = `cat tmp/edit.json | pbcopy`
      const cmdNotify = `echo "✅ Текст скопирован в буфер обмена!"`
      return `bun run ${Tool("actions/edit/cli.ts")} tmp/edit.json && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "commit",
    name: "📦 Commit",
    description: "Git Add + Diff + Context -> Commit Msg (+Copy)",
    getCommand: () => {
      const cmdGitAdd = `git add .`
      const cmdGitDiff = `git diff --staged > tmp/diff.patch`
      const cmdCommitGen = `bun run ${Tool("actions/commit/cli.ts")} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
      const cmdCopy = `cat tmp/commit.md | pbcopy`
      const cmdNotify = `echo "✅ Текст коммита скопирован в буфер обмена!"`
      return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${CHAIN_GEN_CONTEXT} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
    },
  },
]

// ==========================================
// 🎯 Сканирование
// ==========================================

interface TargetContext {
  name: string
  path: string
  type: "root" | "package"
}

async function scanTargetProject(): Promise<TargetContext[]> {
  const currentDir = process.cwd()
  const contexts: TargetContext[] = []

  let rootName = "Root"
  try {
    const pkgPath = join(currentDir, "package.json")
    if (await Bun.file(pkgPath).exists()) {
      const pkg = await Bun.file(pkgPath).json()
      rootName = pkg.name || "Root"
      contexts.push({ name: `${rootName} (Root)`, path: currentDir, type: "root" })

      const workspaces = pkg.workspaces
      if (workspaces && Array.isArray(workspaces)) {
        for (const pattern of workspaces) {
          const cleanPattern = pattern.replace(/\/\*$/, "")
          const workspaceRoot = join(currentDir, cleanPattern)

          if (await Bun.file(workspaceRoot).exists() || (await readdir(workspaceRoot).catch(() => [])).length > 0) {
            const dirs = await readdir(workspaceRoot, { withFileTypes: true })
            for (const dir of dirs) {
              if (dir.isDirectory()) {
                const pkgPath = join(workspaceRoot, dir.name)
                const pkgJsonPath = join(pkgPath, "package.json")
                if (await Bun.file(pkgJsonPath).exists()) {
                  const subPkg = await Bun.file(pkgJsonPath).json()
                  contexts.push({ name: subPkg.name || dir.name, path: pkgPath, type: "package" })
                }
              }
            }
          }
        }
      }
    } else {
       contexts.push({ name: "Current Directory", path: currentDir, type: "root" })
    }
  } catch (e) {
    contexts.push({ name: "Current Directory", path: currentDir, type: "root" })
  }
  return contexts
}

// ==========================================
// 🎨 TUI
// ==========================================

const K = { UP: "\u001b[A", DOWN: "\u001b[B", ENTER: "\r", CTRL_C: "\u0003", ESC: "\u001b" }
const C = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  selected: "\x1b[36m❯ \x1b[1m",
  unselected: "  ",
}

async function menu<T>(title: string, items: T[], fmt: (i: T) => string): Promise<T | null> {
  let idx = 0
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding("utf8")

  const render = () => {
    process.stdout.write("\x1b[2J\x1b[H")
    console.log(`\n${C.bold}🤖 AI Tool Wrapper${C.reset}\n`)
    console.log(`${C.yellow}${title}${C.reset}\n`)
    items.forEach((item, i) => {
      console.log(i === idx ? `${C.selected}${C.cyan}${fmt(item)}${C.reset}` : `${C.unselected}${fmt(item)}`)
    })
    console.log(`\n${C.gray}↑/↓ Select | Enter Confirm | Esc Exit${C.reset}`)
  }

  return new Promise((resolve) => {
    render()
    const handler = (key: string) => {
      if (key === K.CTRL_C) process.exit(0)
      if (key === K.ESC) {
        cleanup()
        resolve(null)
        return
      }
      if (key === K.UP) {
        idx = (idx - 1 + items.length) % items.length
        render()
      }
      if (key === K.DOWN) {
        idx = (idx + 1) % items.length
        render()
      }
      if (key === K.ENTER) {
        cleanup()
        resolve(items[idx])
      }
    }
    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.off("data", handler)
      process.stdout.write("\x1b[2J\x1b[H")
    }
    process.stdin.on("data", handler)
  })
}

// ==========================================
// 🚀 Execution
// ==========================================

async function runTool(tool: ToolDefinition, context: TargetContext) {
  const shellCommand = tool.getCommand()

  console.log(`\n${C.green}🚀 Запуск: ${tool.name}${C.reset}`)
  console.log(`📂 Контекст: ${C.bold}${context.path}${C.reset}`)
  
  if (process.env.VERBOSE) {
    console.log(`🛠  Команда: ${C.gray}${shellCommand}${C.reset}\n`)
  }

  const proc = Bun.spawn(["sh", "-c", shellCommand], {
    cwd: context.path,
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, AI_ROOT: AI_ROOT },
  })

  await proc.exited

  console.log(`\n${C.gray}Нажмите любую клавишу...${C.reset}`)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  await new Promise<void>((r) =>
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false)
      r()
    })
  )
}

// ==========================================
// 🏁 Main
// ==========================================

async function main() {
  while (true) {
    // 1. Выбор контекста
    const contexts = await scanTargetProject()
    const context = await menu("Где запускаем?", contexts, (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`))
    
    if (!context) process.exit(0)

    // 2. Создание конфига СРАЗУ ПОСЛЕ ВЫБОРА КОНТЕКСТА
    await ensureConfigFile(context.path)

    // 3. Выбор инструмента
    const tool = await menu(
      `Контекст: ${context.name}`,
      TOOLS,
      (t) => `${t.name} ${C.gray}| ${t.description}${C.reset}`
    )
    
    if (!tool) continue

    // 4. Запуск
    await runTool(tool, context)
  }
}

main()
