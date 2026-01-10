import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import type { TaskDefinition } from "./tools"
import { getFilesCmd, getContextCmd, getContextChain, PATH_LINT, PATH_EDIT, PATH_COMMIT } from "./tools"

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
    id: "edit",
    name: "🔨 Редактирование",
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
    id: "files",
    name: "📂 Файлы",
    description: "Выбор файлов",
    getCommand: async (ctx) => `mkdir -p tmp && ${await getFilesCmd(ctx)}`,
  },
  {
    id: "join",
    name: "📝 Данные",
    description: "Объединение файлов и структуры в один файл",
    getCommand: async (ctx) => `mkdir -p tmp && ${await getContextCmd(ctx)}`,
  },
  {
    id: "lint",
    name: "🧹 Ошибки",
    description: "Сбор данных для исправления ошибок",
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
    id: "commit",
    name: "📦 Коммит",
    description: "Сбор данных для коммита",
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
