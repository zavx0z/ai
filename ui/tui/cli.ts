#!/usr/bin/env bun
import { scanTargetProject } from "./src/core/scanner"
import { TOOLS } from "./src/core/tools"
import { runTool } from "./src/runner/executor"
import { select } from "./src/ui/select"
import { Theme } from "./src/ui/theme"

async function main() {
  while (true) {
    const contexts = await scanTargetProject()
    
    const context = await select(
      "Где запускаем?", 
      contexts, 
      (c) => (c.type === "root" ? `📁 ${c.name}` : `📦 ${c.name}`)
    )
    
    if (!context) process.exit(0)

    const tool = await select(
      `Контекст: ${context.name}`,
      TOOLS,
      (t) => `${t.name} ${Theme.gray}| ${t.description}${Theme.reset}`
    )
    
    if (!tool) continue

    await runTool(tool, context)
  }
}

main()