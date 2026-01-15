import { pressKeyWithModifier, ensureEnglish, restoreLayout } from "ai-keyboard"
import { focusWindow } from "./common"

/**
 * Открывает новый чат
 */
/**
 * Переключает фокус на чат
 */
export async function focus() {
  await focusWindow("DeepSeek")
}

export async function openNewChat() {
  const prevLayout = await ensureEnglish()
  await pressKeyWithModifier('command', 'j')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
}