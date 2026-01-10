import { Tool } from "./constants"
import { join } from "path"
import type { TargetContext } from "./scanner"

export interface ToolDefinition {
  id: string
  name: string
  description: string
  getCommand: (ctx: TargetContext) => string | Promise<string>
}

// --- Helpers ---

const PATH_TREE = Tool("ui/tree-explorer/index.ts")
const PATH_JOIN = Tool("actions/join/cli.ts")
const PATH_LINT = Tool("actions/lint/cli.ts")
const PATH_EDIT = Tool("actions/edit/cli.ts")
const PATH_COMMIT = Tool("actions/commit/cli.ts")

/**
 * Читает настройки exclude из zavx0z.yaml текущего контекста
 */
async function getExcludes(ctx: TargetContext): Promise<string> {
  const defaultExcludes = [
    "node_modules",
    "tmp",
    ".git",
    ".vscode",
    "dist",
    ".idea",
    ".idx",
    "bun.lock",
    "package-lock.json",
  ]

  try {
    const configPath = join(ctx.path, "zavx0z.yaml")
    const file = Bun.file(configPath)

    if (await file.exists()) {
      const text = await file.text()
      const yaml = Bun.YAML.parse(text)

      // Явное приведение типа для TypeScript
      const config = yaml as { exclude?: string[] }
      if (config && Array.isArray(config.exclude)) {
        return config.exclude.map((e: string) => `-e "${e}"`).join(" ")
      }
    }
  } catch (e) {
    // Fallback to default if error
  }

  return defaultExcludes.map((e) => `-e "${e}"`).join(" ")
}

/**
 * Генерирует команду для создания files.json с учетом исключений
 */
async function getFilesCmd(ctx: TargetContext) {
  const excludes = await getExcludes(ctx)
  return `bun run ${PATH_TREE} ${excludes} -p -o tmp/files.json`
}

/**
 * Генерирует цепочку: Files -> Join
 */
async function getContextCmd(ctx: TargetContext) {
  const filesCmd = await getFilesCmd(ctx)
  const joinCmd = `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
  return `${filesCmd} && ${joinCmd}`
}

// --- Tools ---

export const TOOLS: ToolDefinition[] = [
  {
    id: "files",
    name: "📂 Files JSON",
    description: "Сканирование файлов в tmp/files.json",
    getCommand: async (ctx) => `mkdir -p tmp && ${await getFilesCmd(ctx)}`,
  },
  {
    id: "join",
    name: "📝 Context (Join)",
    description: "Генерация tmp/join.md (Files + Tree)",
    getCommand: async (ctx) => `mkdir -p tmp && ${await getContextCmd(ctx)}`,
  },
  {
    id: "lint",
    name: "🧹 Lint",
    description: "Линтинг + Контекст (join >> lint.md)",
    getCommand: async (ctx) => {
      const ctxCmd = await getContextCmd(ctx)
      const cmdLint = `bun run ${PATH_LINT} . -o tmp/lint.md`
      const cmdAppend = `cat tmp/join.md >> tmp/lint.md`

      const cmdCopy = `cat tmp/lint.md | pbcopy`
      const cmdNotify = `echo "✅ Текст скопирован в буфер обмена!"`

      return `mkdir -p tmp && ${ctxCmd} && ${cmdLint} && ${cmdAppend} && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "edit-context",
    name: "🤖 Edit Context",
    description: "Подготовка контекста для редактирования (edit.md)",
    getCommand: async (ctx) => {
      const ctxCmd = await getContextCmd(ctx)
      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const cmdConcat = `cat tmp/join.md ${docBun} ${docEdit} > tmp/edit.md`
      const cmdCopy = `cat tmp/edit.md | pbcopy`
      const cmdNotify = `echo "✅ Текст скопирован в буфер обмена!"`
      return `mkdir -p tmp && ${ctxCmd} && ${cmdConcat} && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "edit",
    name: "🔨 Apply Edit",
    description: "Применить изменения из tmp/edit.json",
    getCommand: () => {
      const cmdCopy = `cat tmp/edit.json | pbcopy`
      const cmdNotify = `echo "✅ Текст скопирован в буфер обмена!"`
      return `bun run ${PATH_EDIT} tmp/edit.json && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "commit",
    name: "📦 Commit",
    description: "Git Add + Diff + Context -> Commit Msg (+Copy)",
    getCommand: async (ctx) => {
      const ctxCmd = await getContextCmd(ctx)
      const cmdGitAdd = `git add .`
      const cmdGitDiff = `git diff --staged > tmp/diff.patch`
      const cmdCommitGen = `bun run ${PATH_COMMIT} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
      const cmdCopy = `cat tmp/commit.md | pbcopy`
      const cmdNotify = `echo "✅ Текст коммита скопирован в буфер обмена!"`
      return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${ctxCmd} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
    },
  },
]
