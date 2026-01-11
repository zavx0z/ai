import { $ } from "bun"
import { pressKeyWithModifier, pressSpecialKey } from "ai-keyboard"

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
async function ensureEnglish() {
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
async function restoreLayout(id: string) {
  if (!id) return
  await $`echo '${SWIFT_RESTORE}' | swift - ${id}`.quiet()
}

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