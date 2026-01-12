import { $ } from "bun"

// Swift-скрипт для проверки текущей раскладки и переключения на английский (US/ABC)
const SWIFT_CHECK = `
import Carbon
let current = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let ptr = TISGetInputSourceProperty(current, kTISPropertyInputSourceID)
let curID = Unmanaged<CFString>.fromOpaque(ptr!).takeUnretainedValue() as String
let targets = ["com.apple.keylayout.ABC", "com.apple.keylayout.US"]
if !targets.contains(curID) {
  let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
  for s in sources {
    let p = TISGetInputSourceProperty(s, kTISPropertyInputSourceID)
    let id = Unmanaged<CFString>.fromOpaque(p!).takeUnretainedValue() as String
    if targets.contains(id) {
      TISSelectInputSource(s)
      print(curID)
      break
    }
  }
}
`

// Swift-скрипт для восстановления предыдущей раскладки по ID
const SWIFT_RESTORE = `
import Carbon
let args = CommandLine.arguments
if args.count > 1 {
  let target = args[1]
  let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
  for s in sources {
    let p = TISGetInputSourceProperty(s, kTISPropertyInputSourceID)
    let id = Unmanaged<CFString>.fromOpaque(p!).takeUnretainedValue() as String
    if id == target {
      TISSelectInputSource(s)
      break
    }
  }
}
`

/**
 * Проверяет раскладку и переключает на английский при необходимости.
 * Возвращает ID предыдущей раскладки или null.
 */
export async function ensureEnglish() {
  try {
    const { stdout } = await $`echo '${SWIFT_CHECK}' | swift -`.quiet()
    return stdout.toString().trim() || null
  } catch (e) {
    return null
  }
}

/**
 * Восстанавливает раскладку по ID.
 */
export async function restoreLayout(id: string) {
  if (!id) return
  await $`echo '${SWIFT_RESTORE}' | swift - ${id}`.quiet()
}

/**
 * Нажать комбинацию клавиш с модификатором
 */
export async function pressKeyWithModifier(modifier: 'command' | 'control' | 'option' | 'shift', key: string) {
  await $`osascript -e 'tell application "System Events"
      keystroke "${key}" using ${modifier} down
    end tell'`
}

/**
 * Нажать комбинацию клавиш с несколькими модификаторами
 */
export async function pressKeyWithModifiers(modifiers: ('command' | 'control' | 'option' | 'shift')[], key: string) {
  const mods = modifiers.map(m => `${m} down`).join(', ')
  await $`osascript -e 'tell application "System Events"
      keystroke "${key}" using {${mods}}
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


