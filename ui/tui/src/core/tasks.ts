import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import { select } from "../ui/select"
import { Theme } from "../ui/theme"
import type { TaskDefinition } from "./tools"
import {
  getFilesCmd,
  getContextCmd,
  getContextChain,
  PATH_LINT,
  PATH_EDIT,
  PATH_COMMIT,
  PATH_TREE,
  getExcludes,
  getJoinCmd,
  PATH_JOIN,
} from "./tools"

export const TASKS: TaskDefinition[] = [
  {
    id: "edit-context",
    name: "🤖 Задача",
    description: "Подготовка контекста (edit.md)",
    actions: [
      { id: "all", name: "🌍 Весь проект", description: "Все файлы (стандарт)" },
      { id: "select", name: "🎯 Выбрать файлы", description: "Интерактивный выбор" },
    ],
    getCommand: async (ctx, actionId) => {
      const taskDescription = await input("📝 Опишите задачу:")
      if (taskDescription === null) return "echo '❌ Отменено'"

      const tmpDir = join(ctx.path, "tmp")
      Bun.spawnSync(["mkdir", "-p", tmpDir])
      await Bun.write(join(tmpDir, "task.md"), `# Задача\n\n${taskDescription}\n\n`)

      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const cmdConcat = `cat tmp/task.md tmp/join.md ${docBun} ${docEdit} > tmp/edit.md`
      const cmdCopy = `cat tmp/edit.md | pbcopy`
      const cmdNotify = `echo "✅ Скопировано в буфер!"`

      switch (actionId) {
        case "select": {
          const excludes = await getExcludes(ctx)
          const cmdTree = `bun run ${PATH_TREE} ${excludes} -o tmp/files.json`
          const cmdJoin = `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
          const chain = `mkdir -p tmp && ${cmdTree} && ${cmdJoin}`
          return `${chain} && ${cmdConcat} && ${cmdCopy} && ${cmdNotify}`
        }
        default: {
          const chain = await getContextChain(ctx)
          return `${chain} && ${cmdConcat} && ${cmdCopy} && ${cmdNotify}`
        }
      }
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

      switch (actionId) {
        case "clipboard":
          return `pbpaste > tmp/edit.json && ${runEdit} && ${cmdNotify}`
        default:
          return `${runEdit} && ${cmdNotify}`
      }
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
    id: "git",
    name: "📦 GIT",
    description: "Git операции + Контекст",
    actions: [
      {
        id: "ful-context",
        name: "📦 Полный контекст",
        description: "Добавить все изменения в коммит и подготовить контекст",
      },
      { id: "select-context", name: "📂 Выбрать файлы", description: "Интерактивный выбор файлов для контекста" },
      { id: "commit-buf", name: "📝 Коммит", description: "Сделать коммит с сообщением из буфера" },
      { id: "push", name: "🚀 Push", description: "git push" },
    ],
    getCommand: async (ctx, actionId) => {
      const chain = await getContextChain(ctx)
      switch (actionId) {
        case "select-context": {
          const cmdGitAdd = `git add .`
          const cmdGitDiff = `git diff --staged > tmp/diff.patch`

          const excludes = await getExcludes(ctx)
          const cmdTree = `bun run ${PATH_TREE} ${excludes} -o tmp/files.json`
          const cmdJoin = getJoinCmd()

          const cmdCommitGen = `bun run ${PATH_COMMIT} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
          const cmdCopy = `cat tmp/commit.md | pbcopy`

          const cmdNotify = `echo "✅ Контекст обновлен!"`
          return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${cmdTree} && ${cmdJoin} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
        }
        case "push": {
          return `git push && echo "✅ Отправлено!"`
        }
        case "commit-buf": {
          const proc = Bun.spawn(["pbpaste"])
          const msg = await new Response(proc.stdout).text()
          const confirm = await select(
            `Подтвердите коммит:\n${Theme.gray}${msg.trim()}${Theme.reset}`,
            ["✅ Отправить", "❌ Отмена"],
            (o) => o
          )
          if (confirm !== "✅ Отправить") return "echo '❌ Отменено'"
          return `git add . && pbpaste | git commit -F - && echo "✅ Закоммичено!"`
        }
        case "ful-context": {
          const cmdGitAdd = `git add .`
          const cmdGitDiff = `git diff --staged > tmp/diff.patch`
          const cmdCommitGen = `bun run ${PATH_COMMIT} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
          const cmdCopy = `cat tmp/commit.md | pbcopy`
          const cmdNotify = `echo "✅ Скопировано в буфер!"`
          return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${chain} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
        }
        default:
          const cmdGitAdd = `git add .`
          const cmdGitDiff = `git diff --staged > tmp/diff.patch`
          const cmdCommitGen = `bun run ${PATH_COMMIT} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
          const cmdCopy = `cat tmp/commit.md | pbcopy`
          const cmdNotify = `echo "✅ Скопировано в буфер!"`
          return `mkdir -p tmp && ${cmdGitAdd} && ${cmdGitDiff} && ${chain} && ${cmdCommitGen} && ${cmdCopy} && ${cmdNotify}`
      }
    },
  },
]
