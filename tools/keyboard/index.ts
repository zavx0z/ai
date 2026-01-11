import { $ } from "bun"

/**
 * Эмулирует нажатие Cmd+J (например, для открытия загрузок)
 */
export async function pressCmdJ() {
  await $`osascript -e 'tell application "System Events" to keystroke "j" using command down'`
}