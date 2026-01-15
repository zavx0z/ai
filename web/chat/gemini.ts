import { pressKeyWithModifiers, ensureEnglish, restoreLayout } from "ai-keyboard"
import { focusWindow } from "./common"

/**
 * Открывает новый чат
 */
/**
 * Переключает фокус на чат
 */
export async function focus() {
  await focusWindow("Gemini")
}

export async function openNewChat() {
  const prevLayout = await ensureEnglish()
  // cmd+shift+o
  await pressKeyWithModifiers(['command', 'shift'], 'o')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
}

export const name = "gemini"
