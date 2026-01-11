import { pressKeyWithModifier, ensureEnglish, restoreLayout } from "ai-keyboard"

/**
 * Открывает новый чат
 */
export async function openNewChat() {
  const prevLayout = await ensureEnglish()
  await pressKeyWithModifier('command', 'j')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
}