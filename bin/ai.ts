#!/usr/bin/env bun
import { join, resolve, dirname } from "path"
import { readdir } from "node:fs/promises"
import { fileURLToPath } from "url"

// ==========================================
// 🛠 НАСТРОЙКА ПУТЕЙ
// ==========================================

const __filename = fileURLToPath(import.meta.url)
// Корень вашего репозитория AI (на уровень выше bin/)
const AI_ROOT = resolve(dirname(__filename), "..")

/**
 * Хелпер для получения абсолютного пути к инструменту внутри AI репо
 */
const Tool = (path: string) => `"${join(AI_ROOT, path)}"`

// ==========================================
// 🏗 БАЗОВЫЕ КОМАНДЫ (Building Blocks)
// ==========================================
// Эти части используются для сборки сложных команд, как в вашем package.json

// 1. "files" - Сбор списка файлов
// Исключаем node_modules, tmp, git, vscode. Сохраняем в tmp/files.json
const CMD_FILES = `bun run ${Tool(
  "tasks/tree-explorer/index.ts"
)} -e node_modules -e tmp -e .git -e .vscode -p -o tmp/files.json`

// 2. "join" - Создание контекста (требует выполнения CMD_FILES перед этим)
const CMD_JOIN = `bun run ${Tool("actions/join/cli.ts")} --file tmp/files.json --output tmp/join.md`

// 3. Полная цепочка для генерации контекста (Files -> Join)
const CHAIN_GEN_CONTEXT = `${CMD_FILES} && ${CMD_JOIN}`

// ==========================================
// 📋 СПИСОК ИНСТРУМЕНТОВ (МЕНЮ)
// ==========================================

interface ToolDefinition {
  id: string
  name: string
  description: string
  /** Возвращает строку команды для выполнения в Shell */
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
      // "lint": "bun run join && bun run actions/lint/cli.ts . -o tmp/lint.md && cat tmp/join.md >> tmp/lint.md"
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
      // "edit-context": "bun run join && cat tmp/join.md ... > tmp/edit.md"

      // Пути к доп файлам контекста (из вашего скрипта)
      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")

      const cmdConcat = `cat tmp/join.md ${docBun} ${docEdit} > tmp/edit.md`

      return `mkdir -p tmp && ${CHAIN_GEN_CONTEXT} && ${cmdConcat}`
    },
  },
  {
    id: "edit",
    name: "🔨 Apply Edit",
    description: "Применить изменения из tmp/edit.json",
    getCommand: () => {
      // "edit": "bun run actions/edit/cli.ts tmp/edit.json"
      return `bun run ${Tool("actions/edit/cli.ts")} tmp/edit.json`
    },
  },
  {
    id: "commit",
    name: "📦 Commit",
    description: "Git Add + Diff + Context -> Commit Msg",
    getCommand: () => {
      // "commit": "git add . && git diff --staged > tmp/diff.patch && bun run join && bun run ... -c tmp/join.md ..."

      const cmdGitAdd = `git add .`
      // Используем --staged, так как мы сделали add .
      const cmdGitDiff = `git diff --staged > tmp/diff.patch`
      const cmdCommitGen = `bun run ${Tool("actions/commit/cli.ts")} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`

      return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${CHAIN_GEN_CONTEXT} && ${cmdCommitGen}`
    },
  },
]

// ==========================================
// 🎯 Сканирование Проекта (как раньше)
// ==========================================

interface TargetContext {
  name: string
  path: string
  type: "root" | "package"
}

async function scanTargetProject(): Promise<TargetContext[]> {
  const currentDir = process.cwd()
  const contexts: TargetContext[] = []

  // Root
  let rootName = "Root"
  try {
    const pkg = await Bun.file(join(currentDir, "package.json")).json()
    rootName = pkg.name || "Root"
    contexts.push({ name: `${rootName} (Root)`, path: currentDir, type: "root" })

    // Workspaces
    const workspaces = pkg.workspaces
    if (workspaces && Array.isArray(workspaces)) {
      for (const pattern of workspaces) {
        const cleanPattern = pattern.replace(/\/\*$/, "")
        const workspaceRoot = join(currentDir, cleanPattern)

        if (!(await Bun.file(workspaceRoot).exists()) && (await readdir(workspaceRoot).catch(() => [])).length > 0) {
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
  // Получаем полную строку команды shell
  const shellCommand = tool.getCommand()

  console.log(`\n${C.green}🚀 Запуск: ${tool.name}${C.reset}`)
  console.log(`📂 Контекст: ${C.bold}${context.path}${C.reset}`)

  if (process.env.VERBOSE) {
    console.log(`🛠  Команда: ${C.gray}${shellCommand}${C.reset}\n`)
  }

  // Запускаем через системный shell (sh), чтобы работали &&, >, >>, |
  const proc = Bun.spawn(["sh", "-c", shellCommand], {
    cwd: context.path, // Выполняем ВНУТРИ целевой папки
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      ...process.env,
      AI_ROOT: AI_ROOT, // Передаем путь к корню на всякий случай
    },
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
    const contexts = await scanTargetProject()
    const context = await menu("Где запускаем?", contexts, (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`))
    if (!context) process.exit(0)

    const tool = await menu(
      `Контекст: ${context.name}`,
      TOOLS,
      (t) => `${t.name} ${C.gray}| ${t.description}${C.reset}`
    )
    if (!tool) continue

    await runTool(tool, context)
  }
}

main()
