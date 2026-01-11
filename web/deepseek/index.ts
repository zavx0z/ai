import { $ } from "bun"
import { pressKeyWithModifier, pressSpecialKey, ensureEnglish, restoreLayout } from "ai-keyboard"

/**
 * Открывает новый чат
 */
export async function openNewChat() {
  const prevLayout = await ensureEnglish()
  await pressKeyWithModifier('command', 'j')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
}

/**
 * Вставляет и отправляет сообщение
 */
export async function pasteAndSend() {
  const prevLayout = await ensureEnglish()
  await pressKeyWithModifier('command', 'v')
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
  await pressSpecialKey('return')
}