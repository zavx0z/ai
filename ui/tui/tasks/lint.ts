import { $ } from "bun"
import { select } from "../src/ui/select"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  PATH_LINT,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
  LINT_MD,
  PATH_EDIT,
  EDIT_JSON,
} from "../src/core/tools"
import * as Window from "ai-window"
import { Deepseek, pasteAndSend } from "ai-chat"

export const task: TaskDefinition = {
  id: "lint",
  name: "🧹 Ошибки",
  description: "Собрать TypeScript ошибки и контекст проекта в буфер",
  run: async (ctx) => {
    await $`mkdir -p ${TMP_DIR}`

    // 1. Запуск линтера
    console.log("🧹 Запуск проверки ошибок...")
    await $`bun run ${{ raw: PATH_LINT }} . -o ${LINT_MD}`

    // 2. Проверка наличия ошибок
    const lintContent = await Bun.file(LINT_MD).text()
    if (!lintContent.trim()) {
      console.log("✨ Ошибок не найдено. Отличная работа!")
      return
    }

    console.log(`⚠️ Найдено ошибок. Подготовка контекста...`)

    // 3. Сбор контекста (если есть ошибки)
    const excludes = await getExcludes(ctx)
    await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
    await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
    await $`cat ${JOIN_MD} >> ${LINT_MD}`
    await $`cat ${LINT_MD} | pbcopy`
    console.log("✅ Скопировано в буфер!")

    // 4. AI Patcher Logic (применение исправлений)
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

    console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)
    await Window.focusChromeWindow(targetId)

    const service = ["deepseek", "gemini", "алиса", "qwen"].find((s) => title.includes(s))

    switch (service) {
      case "deepseek":
        await Deepseek.openNewChat()
        await pasteAndSend()
        break
      case "gemini":
      case "алиса":
      case "qwen":
        await pasteAndSend()
        break
    }

    const initialClipboard = await $`pbpaste`.text()
    const success = await Window.waitForClipboardChange(initialClipboard)

    if (success) {
      console.log("✅ Буфер обновлен! Возвращаюсь...")
      await Window.restoreApp(currentApp)
      await $`pbpaste > ${EDIT_JSON}`
      await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`
      console.log("✅ Изменения применены!")
    } else {
      console.log("⚠️ Ожидание отменено.")
      await Window.restoreApp(currentApp)
    }
  },
}