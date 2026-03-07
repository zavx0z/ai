import { $ } from "bun";
import {
  pressKeyWithModifier,
  pressSpecialKey,
  ensureEnglish,
  restoreLayout,
} from "ai-keyboard";
import { getChromeWindows, focusChromeWindow } from "ai-window";
import { stripMarkdownWrapper } from "./utils";

/**
 * Получает очищенное содержимое буфера обмена
 */
export async function getCleanClipboard(): Promise<string> {
  const content = await $`pbpaste`.text();
  return stripMarkdownWrapper(content);
}

/**
 * Вставляет и отправляет сообщение
 */
export async function pasteAndSend(message?: string) {
  const prevLayout = await ensureEnglish();

  // Если передано сообщение, обрабатываем его и копируем в буфер
  if (message) {
    const cleaned = stripMarkdownWrapper(message);
    await $`echo ${cleaned} | pbcopy`;
  }

  await pressKeyWithModifier("command", "v");
  if (prevLayout) await restoreLayout(prevLayout);
  await Bun.sleep(200);
  await pressSpecialKey("return");
}

/**
 * Переключает фокус на окно по части заголовка
 */
export async function focusWindow(titlePart: string) {
  const windows = await getChromeWindows();
  const window = windows.find(
    (w) =>
      w.title != null &&
      w.title.toLowerCase().includes(titlePart.toLowerCase()),
  );
  if (window?.id) await focusChromeWindow(window.id);
}
