#!/usr/bin/env bun
import { scanTargetProject } from "./src/core/scanner"

import { TASKS } from "./src/core/tasks"

import { runTool } from "./src/runner/executor"
import { select } from "./src/ui/select"
import { Theme } from "./src/ui/theme"

async function main() {
  while (true) {
    const contexts = await scanTargetProject()
    
    let context
    
    if (contexts.length === 1) {
      // Если только один пакет/директория, используем его автоматически
      context = contexts[0]
    } else {
      // Если несколько вариантов, показываем выбор
      context = await select(
        "Где запускаем?", 
        contexts, 
        (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`)
      )
      
      if (!context) process.exit(0)
    }

    while (true) {
      const maxNameLen = Math.max(...TASKS.map((t) => t.name.length))

      const task = await select(
        `Контекст: ${context.name}`,
        TASKS,
        (t) => {
          const padding = " ".repeat(maxNameLen - t.name.length)
          return `${t.name}${padding}  ${Theme.gray}| ${t.description}${Theme.reset}`
        }
      )
      
      if (!task) break

      await runTool(task, context)
    }
  }
}

main()