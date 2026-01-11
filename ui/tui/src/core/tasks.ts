import { $ } from "bun"
import { Tool } from "./constants"
import { join } from "path"
import { input } from "../ui/input"
import { select } from "../ui/select"
import { Theme } from "../ui/theme"
import type { TaskDefinition } from "./tools"
import {
  getExcludes,
  PATH_LINT,
  PATH_EDIT,
  PATH_COMMIT,
  PATH_TREE,
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
    run: async (ctx, actionId) => {
      const taskDescription = await input("📝 Опишите задачу:")
      if (taskDescription === null) {
        console.log("❌ Отменено")
        return
      }

      const tmpDir = "tmp"
      await $`mkdir -p ${tmpDir}` // Создаем временную директорию
      await Bun.write(join(tmpDir, "task.md"), `# Задача\n\n${taskDescription}\n\n`) // Записываем описание задачи

      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const excludes = await getExcludes(ctx) // Получаем список исключений

      // Setup Context
      if (actionId === "select") {
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -o tmp/files.json` // Интерактивный выбор файлов
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Объединение выбранных файлов
      } else {
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -p -o tmp/files.json` // Автоматический сбор всех файлов (пайплайн)
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Объединение всех файлов
      }

      // Concat & Copy
      await $`cat tmp/task.md tmp/join.md ${{raw: docBun}} ${{raw: docEdit}} > tmp/edit.md` // Сборка итогового промпта с инструкциями
      await $`cat tmp/edit.md | pbcopy` // Копирование в буфер обмена
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
        await $`pbpaste > tmp/edit.json` // Сохранение JSON из буфера во временный файл
      }
      await $`bun run ${{raw: PATH_EDIT}} tmp/edit.json` // Запуск агента редактирования
      console.log("✅ Изменения применены!")
    },
  },
  {
    id: "join",
    name: "📝 Данные",
    description: "Объединение файлов и структуры в один файл",
    run: async (ctx) => {
      await $`mkdir -p tmp` // Создание временной директории
      const excludes = await getExcludes(ctx)
      await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -p -o tmp/files.json` // Сбор списка всех файлов
      await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Генерация единого Markdown файла
    },
  },
  {
    id: "lint",
    name: "🧹 Ошибки",
    description: "Сбор данных для исправления ошибок",
    run: async (ctx) => {
      await $`mkdir -p tmp` // Создание временной директории
      const excludes = await getExcludes(ctx)
      await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -p -o tmp/files.json` // Сбор списка файлов
      await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Объединение файлов для контекста
      await $`bun run ${{raw: PATH_LINT}} . -o tmp/lint.md` // Запуск линтера и сохранение отчета
      await $`cat tmp/join.md >> tmp/lint.md` // Добавление кода к отчету об ошибках
      await $`cat tmp/lint.md | pbcopy` // Копирование результата в буфер
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
        await $`git push` // Отправка изменений в удаленный репозиторий
        console.log("✅ Отправлено!")
        return
      }

      if (actionId === "commit-buf") {
        const msg = await $`pbpaste`.text() // Получение сообщения коммита из буфера
        const confirm = await select(
          `Подтвердите коммит:\n${Theme.gray}${msg.trim()}${Theme.reset}`,
          ["✅ Отправить", "❌ Отмена"],
          (o) => o
        )

        if (confirm !== "✅ Отправить") {
          console.log("❌ Отменено")
          return
        }

        await $`git add .` // Добавление всех изменений в индекс
        await $`pbpaste | git commit -F -` // Коммит с использованием сообщения из stdin
        console.log("✅ Закоммичено!")
        return
      }

      // Prepare Context
      await $`mkdir -p tmp` // Создание временной директории
      await $`git add .` // Добавление изменений в индекс
      await $`git diff --staged > tmp/diff.patch` // Создание патча изменений

      const excludes = await getExcludes(ctx)

      if (actionId === "select-context") {
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -o tmp/files.json` // Интерактивный выбор файлов контекста
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Объединение выбранных файлов
      } else {
        await $`bun run ${{raw: PATH_TREE}} ${{raw: excludes}} -p -o tmp/files.json` // Автоматический сбор файлов контекста
        await $`bun run ${{raw: PATH_JOIN}} --file tmp/files.json --output tmp/join.md` // Объединение файлов
      }

      await $`bun run ${{raw: PATH_COMMIT}} tmp/diff.patch -c tmp/join.md -o tmp/commit.md` // Генерация сообщения коммита с учетом контекста
      await $`cat tmp/commit.md | pbcopy` // Копирование результата в буфер

      if (actionId === "select-context") {
        console.log("✅ Контекст обновлен!")
      } else {
        console.log("✅ Скопировано в буфер!")
      }
    },
  },
]
