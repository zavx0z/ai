import { $ } from "bun"
import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import { select } from "../ui/select"
import { Theme } from "../ui/theme"
import type { TaskDefinition } from "./tools"
import { getExcludes, PATH_LINT, PATH_EDIT, PATH_COMMIT, PATH_TREE, PATH_JOIN } from "./tools"

const TMP_DIR = "tmp"
const TASK_MD = join(TMP_DIR, "task.md")
const FILES_JSON = join(TMP_DIR, "files.json")
const JOIN_MD = join(TMP_DIR, "join.md")
const EDIT_MD = join(TMP_DIR, "edit.md")
const EDIT_JSON = join(TMP_DIR, "edit.json")
const LINT_MD = join(TMP_DIR, "lint.md")
const DIFF_PATCH = join(TMP_DIR, "diff.patch")
const COMMIT_MD = join(TMP_DIR, "commit.md")

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

      await $`mkdir -p ${TMP_DIR}`
      await Bun.write(TASK_MD, `# Задача\n\n${taskDescription}\n\n`)

      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const excludes = await getExcludes(ctx)

      switch (actionId) {
        case "select":
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -o ${FILES_JSON}`
          break
        default:
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
          break
      }

      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
      await $`cat ${TASK_MD} ${JOIN_MD} ${{ raw: docBun }} ${{ raw: docEdit }} > ${EDIT_MD}`
      await $`cat ${EDIT_MD} | pbcopy`
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
      switch (actionId) {
        case "clipboard":
          await $`pbpaste > ${EDIT_JSON}`
          break
      }
      await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`
      console.log("✅ Изменения применены!")
    },
  },
  {
    id: "join",
    name: "📝 Данные",
    description: "Объединение файлов и структуры в один файл",
    run: async (ctx) => {
      await $`mkdir -p ${TMP_DIR}`
      const excludes = await getExcludes(ctx)
      await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
    },
  },
  {
    id: "lint",
    name: "🧹 Ошибки",
    description: "Сбор данных для исправления ошибок",
    run: async (ctx) => {
      await $`mkdir -p ${TMP_DIR}`
      const excludes = await getExcludes(ctx)
      await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
      await $`bun run ${{ raw: PATH_LINT }} . -o ${LINT_MD}`
      await $`cat ${JOIN_MD} >> ${LINT_MD}`
      await $`cat ${LINT_MD} | pbcopy`
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
      switch (actionId) {
        case "push":
          await $`git push`
          console.log("✅ Отправлено!")
          return

        case "commit-buf":
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

        case "select-context":
          await $`mkdir -p ${TMP_DIR}`
          await $`git add .`
          await $`git diff --staged > ${DIFF_PATCH}`
          const excludes = await getExcludes(ctx)
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -o ${FILES_JSON}`
          await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
          await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
          await $`cat ${COMMIT_MD} | pbcopy`
          console.log("✅ Контекст обновлен!")
          return

        default:
          await $`mkdir -p ${TMP_DIR}`
          await $`git add .`
          await $`git diff --staged > ${DIFF_PATCH}`
          const excludes2 = await getExcludes(ctx)
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes2 }} -p -o ${FILES_JSON}`
          await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
          await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
          await $`cat ${COMMIT_MD} | pbcopy`
          console.log("✅ Скопировано в буфер!")
          return
      }
    },
  },
]
