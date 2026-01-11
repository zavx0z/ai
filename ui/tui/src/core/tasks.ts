import { $ } from "bun"
import { Tool } from "./constants"
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
  TMP_DIR,
  TASK_MD,
  FILES_JSON,
  JOIN_MD,
  EDIT_MD,
  COMMIT_MD,
  DIFF_PATCH,
  EDIT_JSON,
  LINT_MD,
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

      await $`mkdir -p ${TMP_DIR}` // Создаем временную директорию
      await Bun.write(TASK_MD, `# Задача\n\n${taskDescription}\n\n`) // Записываем описание задачи

      const docBun = Tool("generator/bun/README.md")
      const docEdit = Tool("actions/edit/edit.md")
      const excludes = await getExcludes(ctx) // Получаем список исключений

      switch (actionId) {
        case "select":
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -o ${FILES_JSON}` // Интерактивный выбор файлов
          break
        default:
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}` // Автоматический сбор всех файлов (пайплайн)
          break
      }

      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Объединение файлов
      await $`cat ${TASK_MD} ${JOIN_MD} ${{ raw: docBun }} ${{ raw: docEdit }} > ${EDIT_MD}` // Сборка итогового промпта с инструкциями
      await $`cat ${EDIT_MD} | pbcopy` // Копирование в буфер обмена
      console.log("✅ Скопировано в буфер!")

      // 1. Узнаем имя текущего приложения
      const currentApp = (
        await $`osascript -e 'tell application "System Events" to bundle identifier of first process whose frontmost is true'`.text()
      ).trim()

      // 2. Получаем список окон Chrome (ID ||| Title)
      const rawWindows = await $`osascript -e 'tell application "Google Chrome"
        set outList to ""
        repeat with w in windows
          set outList to outList & (id of w) & "|||" & (title of w) & "\n"
        end repeat
        return outList
      end tell'`.text()

      const windows = rawWindows
        .trim()
        .split("\n")
        .filter((l) => l.length > 0)
        .map((line) => {
          const [id, title] = line.split("|||")
          return { id, title: title || "Без названия" }
        })

      if (windows.length === 0) {
        console.log("❌ Chrome не запущен или нет открытых окон")
        return
      }

      let targetId = windows[0]!.id

      if (windows.length > 1) {
        const selectedTitle = await select(
          "🌍 Выберите окно Chrome:",
          windows.map((w) => w.title),
          (t) => t
        )
        const found = windows.find((w) => w.title === selectedTitle)
        if (found) targetId = found.id
      }

      console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)

      // 3. Активируем конкретное окно
      await $`osascript -e 'tell application "Google Chrome"
        set index of window id ${targetId} to 1
        activate
      end tell'`

      console.log("⏳ Ожидание ответа в буфере обмена... (Нажмите Enter для отмены)")
      const initialClipboard = await $`pbpaste`.text()

      const reader = Bun.stdin.stream().getReader()
      let stopWaiting = false

      const checkClipboardLoop = async () => {
        while (!stopWaiting) {
          const current = await $`pbpaste`.text()
          if (current !== initialClipboard) return true
          await Bun.sleep(500)
        }
        return false
      }

      const waitInput = async () => {
        await reader.read()
        return false
      }

      const success = await Promise.race([checkClipboardLoop(), waitInput()])
      
      stopWaiting = true
      reader.cancel()

      if (success) {
        console.log("✅ Буфер обновлен! Возвращаюсь...")
      } else {
        console.log("⚠️ Ожидание отменено.")
      }

      // Возвращаем фокус
      await $`osascript -e 'tell application id "${currentApp}" to activate'`
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
          await $`pbpaste > ${EDIT_JSON}` // Сохранение JSON из буфера во временный файл
          break
      }
      await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}` // Запуск агента редактирования
      console.log("✅ Изменения применены!")
    },
  },
  {
    id: "join",
    name: "📝 Данные",
    description: "Объединение файлов и структуры в один файл",
    run: async (ctx) => {
      await $`mkdir -p ${TMP_DIR}` // Создание временной директории
      const excludes = await getExcludes(ctx)
      await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}` // Сбор списка всех файлов
      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Генерация единого Markdown файла
    },
  },
  {
    id: "lint",
    name: "🧹 Ошибки",
    description: "Сбор данных для исправления ошибок",
    run: async (ctx) => {
      await $`mkdir -p ${TMP_DIR}` // Создание временной директории
      const excludes = await getExcludes(ctx)
      await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}` // Сбор списка файлов
      await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Объединение файлов для контекста
      await $`bun run ${{ raw: PATH_LINT }} . -o ${LINT_MD}` // Запуск линтера и сохранение отчета
      await $`cat ${JOIN_MD} >> ${LINT_MD}` // Добавление кода к отчету об ошибках
      await $`cat ${LINT_MD} | pbcopy` // Копирование результата в буфер
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
      { id: "changed-context", name: "⚡ Изменения", description: "Контекст только измененных файлов" },
      { id: "select-context", name: "📂 Выбрать файлы", description: "Интерактивный выбор файлов для контекста" },
      { id: "commit-buf", name: "📝 Коммит", description: "Сделать коммит с сообщением из буфера" },
      { id: "push", name: "🚀 Push", description: "git push" },
    ],
    run: async (ctx, actionId) => {
      const excludes = await getExcludes(ctx)
      switch (actionId) {
        case "push":
          await $`git push` // Отправка изменений в удаленный репозиторий
          console.log("✅ Отправлено!")
          return

        case "commit-buf":
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

        case "changed-context":
          await $`mkdir -p ${TMP_DIR}` // Создание временной директории
          await $`git add .` // Добавление изменений в индекс
          await $`git diff --staged > ${DIFF_PATCH}` // Создание патча изменений
          const changedFiles = (await $`git diff --name-only --cached`.text())
            .trim()
            .split("\n")
            .filter((l) => l.length > 0)
          await Bun.write(FILES_JSON, JSON.stringify(changedFiles))
          await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Объединение выбранных файлов
          await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}` // Генерация сообщения коммита с учетом контекста
          await $`cat ${COMMIT_MD} | pbcopy` // Копирование результата в буфер
          console.log("✅ Контекст изменений обновлен!")
          return

        case "select-context":
          await $`mkdir -p ${TMP_DIR}` // Создание временной директории
          await $`git add .` // Добавление изменений в индекс
          await $`git diff --staged > ${DIFF_PATCH}` // Создание патча изменений
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -o ${FILES_JSON}` // Интерактивный выбор файлов контекста
          await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Объединение выбранных файлов
          await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}` // Генерация сообщения коммита с учетом контекста
          await $`cat ${COMMIT_MD} | pbcopy` // Копирование результата в буфер
          console.log("✅ Контекст обновлен!")
          return

        default:
          await $`mkdir -p ${TMP_DIR}` // Создание временной директории
          await $`git add .` // Добавление изменений в индекс
          await $`git diff --staged > ${DIFF_PATCH}` // Создание патча изменений
          await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}` // Автоматический сбор файлов контекста
          await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}` // Объединение файлов
          await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}` // Генерация сообщения коммита с учетом контекста
          await $`cat ${COMMIT_MD} | pbcopy` // Копирование результата в буфер
          console.log("✅ Скопировано в буфер!")
          return
      }
    },
  },
]
