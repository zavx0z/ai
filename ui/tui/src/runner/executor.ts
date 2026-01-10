import type { TaskDefinition } from "../core/tools"
import type { TargetContext } from "../core/scanner"
import { AI_ROOT } from "../core/constants"
import { Theme } from "../ui/theme"
import { ensureConfigFile } from "../core/config"
import { select } from "../ui/select"

export async function runTool(task: TaskDefinition, context: TargetContext) {
  await ensureConfigFile(context.path)
  
  while (true) {
    let actionId: string | undefined

    // Если есть действия (Actions), предлагаем выбор
    if (task.actions && task.actions.length > 0) {
      const maxActionNameLen = Math.max(...task.actions.map((a) => a.name.length))
      const selectedAction = await select(
        `Действие: ${task.name}`,
        task.actions,
        (a) => {
          const padding = " ".repeat(maxActionNameLen - a.name.length)
          const desc = a.description ? ` ${Theme.gray}| ${a.description}${Theme.reset}` : ""
          return `${a.name}${padding} ${desc}`
        }
      )
      if (!selectedAction) return
      actionId = selectedAction.id
    }
    
    const shellCommand = await task.getCommand(context, actionId)
    console.log(`\n${Theme.green}🚀 Запуск: ${task.name}${Theme.reset}`)
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

    if (!task.actions || task.actions.length === 0) break
  }
}