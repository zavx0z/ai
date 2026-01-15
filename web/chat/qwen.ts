/**
 * Открывает новый чат
 */
import { focusWindow } from "./common"

/**
 * Переключает фокус на чат
 */
export async function focus() {
  await focusWindow("Qwen")
}

export async function openNewChat() {
  await Bun.sleep(200)
}