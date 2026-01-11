import { $ } from "bun"
import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import { select } from "../ui/select"
import { Theme } from "../ui/theme"
import type { TaskDefinition } from "./tools"
import {
  getFilesCmd,
  getExcludes,
  getJoinCmd,
  PATH_LINT,
  PATH_EDIT,
  PATH_COMMIT,
  PATH_TREE,
  PATH_JOIN,
} from "./tools"

// Helper for raw commands from tools.ts
async function runRaw(cmd: string) {
  await $`${{ raw: cmd }}`
}

export const TASKS: TaskDefinition[] = [
  {
    id: "edit-context",
    name: "🤖 Задача",
    description: "Подготовка контекста (edit.md)",
    actions: [
      { id: "all", name: "🌍 Весь проект", description: "Все файлы (стандарт)" },
      { id: "select", name: "🎯 Выбрать файлы", description: "Интерактивный выбор" },
    ],
    run: async (ctx, actionId) => {
      const taskDescription = await input("📝 Опишите задачу:")
      if (taskDescription === null) {
        console.log("❌ Отменено")
        return
      }

      const tmpDir = "tmp"
      await $`mkdir -p ${tmpDir}`
      await Bun.write(join(tmpDir, "task.md"), `# Задача\n\n${taskDescription}\n\n`)

      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      
      // Setup Context
      if (actionId === "select") {
        const excludes = await getExcludes(ctx)
        // Tool() returns quoted string, excludes is string args
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -o tmp/files.json`
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md`
      } else {
        await runRaw(await getFilesCmd(ctx))
        await runRaw(getJoinCmd())
      }

      // Concat & Copy
      await $`cat tmp/task.md tmp/join.md ${{raw: docBun}} ${{raw: docEdit}} > tmp/edit.md`
      await $`cat tmp/edit.md | pbcopy`
      console.log("✅ Скопировано в буфер!")
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
    run: async (ctx, actionId) => {
      if (actionId === "clipboard") {
        await $`pbpaste > tmp/edit.json`
      }
      await $`bun run ${{raw: PATH_EDIT}} tmp/edit.json`
      console.log("✅ Изменения применены!")
    },
  },
  {
    id: "join",
    name: "📝 Данные",
    description: "Объединение файлов и структуры в один файл",
    run: async (ctx) => {
      await $`mkdir -p tmp`
      await runRaw(await getFilesCmd(ctx))
      await runRaw(getJoinCmd())
    },
  },
  {
    id: "lint",
    name: "🧹 Ошибки",
    description: "Сбор данных для исправления ошибок",
    run: async (ctx) => {
      await $`mkdir -p tmp`
      await runRaw(await getFilesCmd(ctx))
      await runRaw(getJoinCmd())

      await $`bun run ${{raw: PATH_LINT}} . -o tmp/lint.md`
      await $`cat tmp/join.md >> tmp/lint.md`
      await $`cat tmp/lint.md | pbcopy`
      console.log("✅ Скопировано в буфер!")
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
    run: async (ctx, actionId) => {
      if (actionId === "push") {
        await $`git push`
        console.log("✅ Отправлено!")
        return
      }

      if (actionId === "commit-buf") {
        const msg = await $`pbpaste`.text()
        const confirm = await select(
          `Подтвердите коммит:\n${Theme.gray}${msg.trim()}${Theme.reset}`,
          ["✅ Отправить", "❌ Отмена"],
          (o) => o
        )
        if (confirm !== "✅ Отправить") {
          console.log("❌ Отменено")
          return
        }
        await $`git add .`
        await $`pbpaste | git commit -F -`
        console.log("✅ Закоммичено!")
        return
      }

      // Prepare Context
      await $`mkdir -p tmp`
      await $`git add .`
      await $`git diff --staged > tmp/diff.patch`

      if (actionId === "select-context") {
        const excludes = await getExcludes(ctx)
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -o tmp/files.json`
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md`
      } else {
        await runRaw(await getFilesCmd(ctx))
        await runRaw(getJoinCmd())
      }

      await $`bun run ${{raw: PATH_COMMIT}} tmp/diff.patch -c tmp/join.md -o tmp/commit.md`
      await $`cat tmp/commit.md | pbcopy`

      if (actionId === "select-context") {
        console.log("✅ Контекст обновлен!")
      } else {
        console.log("✅ Скопировано в буфер!")
      }
    },
  },
]
