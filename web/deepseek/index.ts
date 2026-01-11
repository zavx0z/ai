import { $ } from "bun"
import { pressKeyWithModifier, pressSpecialKey } from "ai-keyboard"

/**
 * Открывает новый чат
 */
export async function openNewChat() {
  await pressKeyWithModifier('command', 'j')
  await Bun.sleep(200)
}

/**
 * Вставляет и отправляет сообщение
 */
export async function pasteAndSend() {
  await pressKeyWithModifier('command', 'v')
  await Bun.sleep(200)
  await pressSpecialKey('return')
}