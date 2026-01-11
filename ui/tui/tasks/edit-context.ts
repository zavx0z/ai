import { $ } from "bun"
import { input } from "../src/ui/input"
import { select } from "../src/ui/select"
import { Theme } from "../src/ui/theme"
import type { TaskDefinition, TaskAction } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  TMP_DIR,
  TASK_MD,
  FILES_JSON,
  JOIN_MD,
  EDIT_MD,
  PATH_EDIT,
  EDIT_JSON,
} from "../src/core/tools"
import * as Window from "ai-window"
import { Tool } from "../src/core/constants"

export const task: TaskDefinition = {
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

    const currentApp = await Window.getCurrentApp()
    const windows = await Window.getChromeWindows()

    if (windows.length === 0) {
      console.log("❌ Chrome не запущен или нет открытых окон")
      return
    }

    let targetId = windows[0]!.id!

    if (windows.length > 1) {
      const selected = await select(
        "🌍 Выберите окно Chrome:",
        windows,
        (w) => w.title
      )
      if (selected) {
        targetId = selected.id!
      }
    }

    console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)
    await Window.focusChromeWindow(targetId)

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
