import { pressKeyWithModifier, pressSpecialKey, ensureEnglish, restoreLayout } from "ai-keyboard"

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