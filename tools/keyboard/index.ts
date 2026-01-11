import { $ } from "bun"

/**
 * Эмулирует последовательность: Cmd+J (открыть), Cmd+V (вставить), Enter (отправить)
 */
export async function pasteAndSend() {
  await $`osascript -e 'tell application "System Events"
      keystroke "j" using command down
      delay 0.2
      keystroke "v" using command down
      delay 0.2
      keystroke return
    end tell'`
}