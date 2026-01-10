import { Tool } from "./constants"

export interface ToolDefinition {
  id: string
  name: string
  description: string
  getCommand: () => string
}

const CMD_FILES = `bun run ${Tool(
  "tasks/tree-explorer/index.ts"
)} -e node_modules -e tmp -e .git -e .vscode -p -o tmp/files.json`

const CMD_JOIN = `bun run ${Tool("actions/join/cli.ts")} --file tmp/files.json --output tmp/join.md`

const CHAIN_GEN_CONTEXT = `${CMD_FILES} && ${CMD_JOIN}`

export const TOOLS: ToolDefinition[] = [
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