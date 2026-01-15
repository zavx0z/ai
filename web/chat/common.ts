import { pressKeyWithModifier, pressSpecialKey, ensureEnglish, restoreLayout } from "ai-keyboard"
import { getChromeWindows, focusChromeWindow } from "ai-window"

/**
 * Вставляет и отправляет сообщение
 */
export async function pasteAndSend() {
  const prevLayout = await ensureEnglish()
  await pressKeyWithModifier("command", "v")
  if (prevLayout) await restoreLayout(prevLayout)
  await Bun.sleep(200)
  await pressSpecialKey("return")
}

/**
 * Переключает фокус на окно по части заголовка
 */
export async function focusWindow(titlePart: string) {
  const windows = await getChromeWindows()
  const window = windows.find((w) => w.title != null && w.title.toLowerCase().includes(titlePart.toLowerCase()))
  if (window?.id) await focusChromeWindow(window.id)
}
