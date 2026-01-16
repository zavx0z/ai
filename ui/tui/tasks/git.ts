import { $ } from "bun"
import * as Window from "ai-window"
import * as Keyboard from "ai-keyboard"
import { Deepseek, Gemini, Alice, Qwen, pasteAndSend } from "ai-chat"
import { resolve } from "node:path"
import { select } from "../src/ui/select"
import { Theme } from "../src/ui/theme"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  PATH_COMMIT,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
  COMMIT_MD,
  DIFF_PATCH,
} from "../src/core/tools"

export const task: TaskDefinition = {
  id: "git",
  name: "📦 GIT",
  description: "Git операции с AI-контекстом (коммит, пушинг, диффы)",
  actions: [
    {
      id: "full-context",
      name: "📦 Полный контекст",
      description: "Контекст всего проекта + дифф + commit.md",
    },
    { id: "changed-context", name: "⚡ Изменения", description: "Контекст только измененных файлов + авто-коммит" },
    { id: "select-context", name: "📂 Выбрать файлы", description: "Выбрать файлы для контекста через tree-explorer" },
    { id: "commit-buf", name: "📝 Коммит", description: "Сделать коммит с сообщением из буфера" },
    { id: "push", name: "🚀 Push", description: "Отправить коммиты в удаленный репозиторий" },
  ],
  run: async (ctx, actionId) => {
    const excludes = await getExcludes(ctx)
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

      case "changed-context":
        // 1. Очистка старых файлов
        console.log("🧹 Очистка временных файлов...")
        await $`rm -f ${FILES_JSON} ${JOIN_MD} ${COMMIT_MD} ${DIFF_PATCH}`
        await $`mkdir -p ${TMP_DIR}`

        // 2. Индексация изменений
        console.log("📦 Индексация изменений (git add)...")
        await $`git add .`
        // Задержка для синхронизации FS
        await Bun.sleep(200)

        // 3. Создание патча
        console.log("📄 Создание патча (git diff)...")
        await $`git diff --staged > ${DIFF_PATCH}`
        
        if (!(await Bun.file(DIFF_PATCH).exists())) {
          console.log("❌ Ошибка: файл патча не создан")
          return
        }

        const gitRoot = (await $`git rev-parse --show-toplevel`.text()).trim()
        const changedFiles = (await $`git diff --name-only --cached`.text())
          .trim()
          .split("\n")
          .filter((l) => l.length > 0)
          .map((f) => resolve(gitRoot, f))

        console.log(`🔎 Найдено измененных файлов: ${changedFiles.length}`)
        await Bun.write(FILES_JSON, JSON.stringify(changedFiles))
        
        if (!(await Bun.file(FILES_JSON).exists())) {
          console.log("❌ Ошибка: список файлов не сохранен")
          return
        }

        // 4. Сборка контекста
        console.log("📝 Сборка контекста...")
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        if (!(await Bun.file(JOIN_MD).exists())) {
          console.log("❌ Ошибка: файл контекста не создан")
          return
        }

        // 5. Генерация промпта
        console.log("🤖 Генерация промпта для коммита...")
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        if (!(await Bun.file(COMMIT_MD).exists())) {
          console.log("❌ Ошибка: файл коммита не создан")
          return
        }

        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Контекст изменений обновлен!")

const currentApp = await Window.getCurrentApp()
const windows = await Window.getChromeWindows()

if (windows.length === 0) {
  console.log("❌ Chrome не запущен или нет открытых окон")
  return
}

let targetId = windows[0]!.id!
let title = windows[0]!.title?.toLowerCase() || ""

if (windows.length > 1) {
  const selected = await select("🌍 Выберите окно Chrome:", windows, (w) => w.title)
  if (selected) {
    targetId = selected.id!
    title = selected.title?.toLowerCase() || ""
  }
}

const service = ["deepseek", "gemini", "алиса", "qwen"].find((s) => title.includes(s))

const mode = await select(
  "🤖 Выберите режим:",
  [
    { id: "new", name: "✨ В новом чате" },
    { id: "current", name: "💬 В текущем чате" },
  ],
  (m) => m.name
)

if (!mode) return

console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)

await Window.focusChromeWindow(targetId)

if (mode.id === "new") {
  switch (service) {
    case "deepseek":
      await Deepseek.openNewChat()
      break
    case "gemini":
      await Gemini.openNewChat()
      break
    case "алиса":
      await Alice.openNewChat()
      break
    case "qwen":
      await Qwen.openNewChat()
      break
  }
}

await pasteAndSend()
        const initialClipboard = await $`pbpaste`.text()
        const success = await Window.waitForClipboardChange(initialClipboard)

          if (success) {
            console.log("✅ Буфер обновлен! Возвращаюсь...")
            await Window.restoreApp(currentApp)
            
            // Выполняем действия из commit-buf
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
          } else {
            console.log("⚠️ Ожидание отменено.")
            await Window.restoreApp(currentApp)
          }
        return

      case "select-context":
        await $`mkdir -p ${TMP_DIR}`
        await $`git add .`
        await $`git diff --staged > ${DIFF_PATCH}`
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} ${{ raw: (await Bun.file(FILES_JSON).exists()) ? `-i ${FILES_JSON}` : "" }} -o ${FILES_JSON}`
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Контекст обновлен!")
        return

      default:
        await $`mkdir -p ${TMP_DIR}`
        await $`git add .`
        await $`git diff --staged > ${DIFF_PATCH}`
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Скопировано в буфер!")
        return
    }
  },
}
