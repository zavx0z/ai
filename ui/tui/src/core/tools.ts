import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import type { TargetContext } from "./scanner"

export interface TaskAction {
  id: string
  name: string
  description?: string
}

export interface TaskDefinition {
  id: string
  name: string
  description: string
  actions?: TaskAction[]
  getCommand: (ctx: TargetContext, actionId?: string) => Promise<string>
}

// --- Path Constants ---

const PATH_TREE = Tool("ui/tree-explorer/index.ts")
const PATH_JOIN = Tool("actions/join/cli.ts")
const PATH_LINT = Tool("actions/lint/cli.ts")
const PATH_EDIT = Tool("actions/edit/cli.ts")
const PATH_COMMIT = Tool("actions/commit/cli.ts")

// --- Helpers ---

async function getContextCmd(ctx: TargetContext) {
  const filesCmd = await getFilesCmd(ctx)
  const joinCmd = `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
  return `${filesCmd} && ${joinCmd}`
}

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
    ".cursor",
    "zavx0z.yaml",
  ]

  try {
    const configPath = join(ctx.path, "zavx0z.yaml")
    const file = Bun.file(configPath)

    if (await file.exists()) {
      const text = await file.text()
      const yaml = Bun.YAML.parse(text) as { exclude?: string[] }

      if (yaml && Array.isArray(yaml.exclude)) {
        return yaml.exclude.map((e: string) => `-e "${e}"`).join(" ")
      }
    }
  } catch (e) {}

  return defaultExcludes.map((e) => `-e "${e}"`).join(" ")
}

async function getFilesCmd(ctx: TargetContext) {
  const excludes = await getExcludes(ctx)
  return `bun run ${PATH_TREE} ${excludes} -p -o tmp/files.json`
}

function getJoinCmd() {
  return `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
}

async function getContextChain(ctx: TargetContext) {
  const files = await getFilesCmd(ctx)
  const join = getJoinCmd()
  return `mkdir -p tmp && ${files} && ${join}`
}

// --- Tasks ---

export const TASKS: TaskDefinition[] = [
  {
    id: "edit-context",
    name: "🤖 Задача",
    description: "Подготовка контекста (edit.md)",
    getCommand: async (ctx) => {
      const taskDescription = await input("📝 Опишите задачу:")
      if (taskDescription === null) return "echo '❌ Отменено'"
      
      const tmpDir = join(ctx.path, "tmp")
      Bun.spawnSync(["mkdir", "-p", tmpDir])
      await Bun.write(join(tmpDir, "task.md"), `# Задача\n\n${taskDescription}\n\n`)

      const chain = await getContextChain(ctx)
      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const cmdConcat = `cat tmp/task.md tmp/join.md ${docBun} ${docEdit} > tmp/edit.md`
      const cmdCopy = `cat tmp/edit.md | pbcopy`
      const cmdNotify = `echo "✅ Скопировано в буфер!"`
      return `${chain} && ${cmdConcat} && ${cmdCopy} && ${cmdNotify}`
    },
  },
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
      const chain = await getContextChain(ctx)
      const cmdLint = `bun run ${PATH_LINT} . -o tmp/lint.md`
      const cmdAppend = `cat tmp/join.md >> tmp/lint.md`
      const cmdCopy = `cat tmp/lint.md | pbcopy`
      const cmdNotify = `echo "✅ Скопировано в буфер!"`
      return `${chain} && ${cmdLint} && ${cmdAppend} && ${cmdCopy} && ${cmdNotify}`
    },
  },
  {
    id: "edit",
    name: "🔨 Apply Edit",
    description: "Применить изменения кода",
    actions: [
      { id: "clipboard", name: "📋 Из буфера", description: "pbpaste > edit.json" },
      { id: "file", name: "📄 Из файла", description: "tmp/edit.json" },
    ],
    getCommand: async (ctx, actionId) => {
      const runEdit = `bun run ${PATH_EDIT} tmp/edit.json`
      const cmdNotify = `echo "✅ Изменения применены!"`

      if (actionId === "clipboard") {
        return `pbpaste > tmp/edit.json && ${runEdit} && ${cmdNotify}`
      }
      return `${runEdit} && ${cmdNotify}`
    },
  },
  {
    id: "commit",
    name: "📦 Commit",
    description: "Git Add + Diff -> Commit Msg",
    getCommand: async (ctx) => {
      const chain = await getContextChain(ctx)
      const cmdGitAdd = `git add .`
      const cmdGitDiff = `git diff --staged > tmp/diff.patch`
      const cmdCommitGen = `bun run ${PATH_COMMIT} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
      const cmdCopy = `cat tmp/commit.md | pbcopy`
      const cmdNotify = `echo "✅ Скопировано в буфер!"`
      return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${chain} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
    },
  },
]
