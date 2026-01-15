import type { TaskDefinition } from "../core/tools"
import type { TargetContext } from "../core/scanner"
import { AI_ROOT } from "../core/constants"
import { Theme } from "../ui/theme"
import { ensureConfigFile } from "../core/config"
import { select } from "../ui/select"

export async function runTool(task: TaskDefinition, context: TargetContext, taskIndex = 0) {
  await ensureConfigFile(context.path)
  
  // Мапа для сохранения индексов действий по taskIndex
  const actionIndices = new Map<number, number>()
  
  while (true) {
    let actionId: string | undefined

    // Если есть действия (Actions), предлагаем выбор
    if (task.actions && task.actions.length > 0) {
      const maxActionNameWidth = Math.max(...task.actions.map((a) => Theme.getTextWidth(a.name)))
      const lastActionIndex = actionIndices.get(taskIndex) || 0
      const selectedAction = await select(
        `Действие: ${task.name}`,
        task.actions,
        (a) => {
          const padding = " ".repeat(maxActionNameWidth - Theme.getTextWidth(a.name))
          const desc = a.description ? `  ${Theme.gray}| ${a.description}${Theme.reset}` : ""
          return `${a.name}${padding}${desc}`
        },
        lastActionIndex
      )
      if (!selectedAction) return
      
      // Сохраняем индекс выбранного действия
      const actionIndex = task.actions.indexOf(selectedAction)
      if (actionIndex !== -1) {
        actionIndices.set(taskIndex, actionIndex)
      }
      
      actionId = selectedAction.id
    }
    
    console.log(`\n${Theme.green}🚀 Запуск: ${task.name}${Theme.reset}`)
    console.log(`📂 Контекст: ${Theme.bold}${context.path}${Theme.reset}\n`)

    const currentCwd = process.cwd()
    process.chdir(context.path)

    try {
      await task.run(context, actionId)
    } catch (e) {
      console.error(`\n${Theme.red}❌ Ошибка: ${e}${Theme.reset}`)
    } finally {
      process.chdir(currentCwd)
    }
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