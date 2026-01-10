#!/usr/bin/env bun
import { scanTargetProject } from "./src/core/scanner"
import { TOOLS } from "./src/core/tools"
import { runTool } from "./src/runner/executor"
import { select } from "./src/ui/select"
import { Theme } from "./src/ui/theme"

async function main() {
  while (true) {
    // 1. Выбор контекста (Проект или Пакет)
    const contexts = await scanTargetProject()
    const context = await select(
      "Где запускаем?", 
      contexts, 
      (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`)
    )
    
    if (!context) process.exit(0)

    // 2. Цикл работы внутри выбранного контекста
    while (true) {
      const tool = await select(
        `Контекст: ${context.name}`,
        TOOLS,
        (t) => `${t.name} ${Theme.gray}| ${t.description}${Theme.reset}`
      )
      
      // Если нажали Esc (tool == null), выходим из этого цикла назад к выбору контекста
      if (!tool) break

      await runTool(tool, context)
      // После выполнения возвращаемся в начало этого цикла (меню инструментов)
    }
  }
}

main()