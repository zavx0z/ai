#!/usr/bin/env bun
import { scanTargetProject, type TargetContext } from "./src/core/scanner"
import { TASKS } from "./tasks"
import { runTool } from "./src/runner/executor"
import { select } from "./src/ui/select"
import { Theme } from "./src/ui/theme"
import { AI_ROOT } from "./src/core/constants"
import * as Window from "ai-window"
import { join } from "path"

async function main() {
  // 🔍 Калибровка окон AI сервисов при запуске
  try {
    const currentApp = await Window.getCurrentApp()
    const windows = await Window.getChromeWindows()
    const services = ["deepseek", "gemini", "алиса", "qwen"]
    const storageDir = join(AI_ROOT, "tmp/ai-chat")
    let hasFocused = false

    for (const service of services) {
      const found = windows.find((w) => w.title?.toLowerCase().includes(service))
      if (found && found.id) {
        const screenshot = await Window.checkWindowSizeAndCapture(found.id, service, storageDir)
        if (screenshot) {
          console.log(`${Theme.green}📸 AI Window Calibrated: ${service}${Theme.reset}`)
          hasFocused = true
        }
      }
    }

    if (hasFocused) {
      await Window.restoreApp(currentApp)
    }
  } catch (e) {
    // Silent fail if window tools not available
  }
  while (true) {
    const contexts = await scanTargetProject()

    let context: TargetContext | null = null

    if (contexts.length === 1) {
      // Если только один пакет/директория, используем его автоматически
      context = contexts[0] ?? null
    } else {
      // Если несколько вариантов, показываем выбор
      context = await select("Где запускаем?", contexts, (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`))
    }

    if (!context) process.exit(0)
    let lastTaskIndex = 0
    while (true) {
      const maxNameLen = Math.max(...TASKS.map((t) => t.name.length))
      const task = await select(
        `Контекст: ${context.name}`,
        TASKS,
        (t) => {
          const padding = " ".repeat(maxNameLen - t.name.length)
          return `${t.name}${padding}  ${Theme.gray}| ${t.description}${Theme.reset}`
        },
        lastTaskIndex
      )

      if (!task) break

      // Сохраняем индекс выбранной задачи
      lastTaskIndex = TASKS.indexOf(task)
      if (lastTaskIndex === -1) lastTaskIndex = 0

      await runTool(task, context, lastTaskIndex)
    }
  }
}

main()
