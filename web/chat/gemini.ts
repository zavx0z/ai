import { pressKeyWithModifiers, ensureEnglish, restoreLayout } from "ai-keyboard"

/**
 * Открывает новый чат
 */
export async function openNewChat() {
  const prevLayout = await ensureEnglish()
  // cmd+shift+o
  await pressKeyWithModifiers(['command', 'shift'], 'o')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
}

export const name = "gemini"
