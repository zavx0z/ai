import type { ToolDefinition } from "../core/tools"
import type { TargetContext } from "../core/scanner"
import { AI_ROOT } from "../core/constants"
import { Theme } from "../ui/theme"
import { ensureConfigFile } from "../core/config"

export async function runTool(tool: ToolDefinition, context: TargetContext) {
  await ensureConfigFile(context.path)

  const shellCommand = tool.getCommand()

  console.log(`\n${Theme.green}🚀 Запуск: ${tool.name}${Theme.reset}`)
  console.log(`📂 Контекст: ${Theme.bold}${context.path}${Theme.reset}`)

  if (process.env.VERBOSE) {
    console.log(`🛠  Команда: ${Theme.gray}${shellCommand}${Theme.reset}\n`)
  }

  const proc = Bun.spawn(["sh", "-c", shellCommand], {
    cwd: context.path,
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, AI_ROOT: AI_ROOT },
  })

  await proc.exited

  console.log(`\n${Theme.gray}Нажмите любую клавишу...${Theme.reset}`)

  process.stdin.setRawMode(true)
  process.stdin.resume()
  await new Promise<void>((r) =>
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false)
      r()
    })
  )
}
