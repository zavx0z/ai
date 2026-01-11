import { $ } from "bun"

/**
 * Нажать комбинацию клавиш с модификатором
 */
export async function pressKeyWithModifier(modifier: 'command' | 'control' | 'option' | 'shift', key: string) {
  await $`osascript -e 'tell application "System Events"
      keystroke "${key}" using ${modifier} down
    end tell'`
}

/**
 * Нажать клавишу
 */
export async function pressKey(key: string) {
  await $`osascript -e 'tell application "System Events"
      keystroke "${key}"
    end tell'`
}

/**
 * Нажать специальную клавишу (return, escape, tab, etc.)
 */
export async function pressSpecialKey(key: 'return' | 'escape' | 'tab' | 'delete' | 'space') {
  const keyName = key === 'space' ? ' ' : key
  await $`osascript -e 'tell application "System Events"
      keystroke ${key === 'space' ? '" "' : key}
    end tell'`
}

/**
 * Эмулирует последовательность: Cmd+J (открыть), Cmd+V (вставить), Enter (отправить)
 */
export async function pasteAndSend() {
  await pressKeyWithModifier('command', 'j')
  await Bun.sleep(200) // Задержка 200ms на уровне Bun
  await pressKeyWithModifier('command', 'v')
  await Bun.sleep(200) // Задержка 200ms на уровне Bun
  await pressSpecialKey('return')
}
