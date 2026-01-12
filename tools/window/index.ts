import { $ } from "bun"

/**
 * Возвращает bundle identifier текущего активного приложения
 */
export async function getCurrentApp() {
  return (
    await $`osascript -e 'tell application "System Events" to bundle identifier of first process whose frontmost is true'`.text()
  ).trim()
}

/**
 * Получает список открытых окон Chrome
 */
export async function getChromeWindows() {
  // Используем string id 10 (newline) для безопасного разделения строк
  const rawWindows = await $`osascript -e 'tell application "Google Chrome"
      set outList to ""
      repeat with w in windows
        set outList to outList & (id of w) & "|||" & (title of w) & string id 10
      end repeat
      return outList
    end tell'`.text()

  return rawWindows
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => {
      const [id, title] = line.split("|||")

      // Оставляем только цифры, чтобы исключить любые проблемы с форматированием
      const cleanId = id?.replace(/\D/g, "")
      

      
      return { id: cleanId, title: title?.trim() || "Без названия" }
    })
}

/**
 * Переключает фокус на указанное окно Chrome
 */
export async function focusChromeWindow(targetId: string) {
  // Находим окно по ID, поднимаем его индекс, разворачиваем если нужно и активируем Chrome
  // Используем стратегию "Double-Tap": устанавливаем индекс до и после активации
  await $`osascript -e 'tell application "Google Chrome"
      set targetWindow to (first window whose id is ${{ raw: targetId }})
      
      -- 1. Предварительный подъем (если Chrome уже активен)
      set index of targetWindow to 1
      if (minimized of targetWindow) then set minimized of targetWindow to false
      
      -- 2. Активация (может сбить Z-order)
      activate
      
      -- 3. Пауза и повторный подъем (гарантия фокуса)
      delay 0.2
      set index of targetWindow to 1
    end tell'`
}

/**
 * Восстанавливает фокус на приложении по bundleId
 */
export async function restoreApp(currentApp: string) {
  await $`osascript -e 'tell application "System Events" to set frontmost of (first process whose bundle identifier is "${currentApp}") to true'`
}

/**
 * Ожидает изменения буфера обмена или нажатия Enter пользователем
 */
export async function waitForClipboardChange(initialClipboard: string): Promise<boolean> {
  console.log("⏳ Ожидание ответа в буфере обмена... (Нажмите Enter для отмены)")
  
  let stopWaiting = false
  const cleanup: { fn: (() => void) | null } = { fn: null }

  const checkClipboardLoop = async () => {
    while (!stopWaiting) {
      const current = await $`pbpaste`.text()
      if (current !== initialClipboard) return true
      await Bun.sleep(500)
    }
    return false
  }

  const waitInput = new Promise<boolean>((resolve) => {
    const handler = () => resolve(false)
    process.stdin.once("data", handler)
    cleanup.fn = () => process.stdin.off("data", handler)
    process.stdin.resume()
  })

  const success = await Promise.race([checkClipboardLoop(), waitInput])
  stopWaiting = true
  if (cleanup.fn) cleanup.fn()
  process.stdin.pause()
  return success
}

/**
 * Получает границы (x, y, width, height) окна Chrome по ID
 */
export async function getChromeWindowBounds(windowId: string) {
  const output = await $`osascript -e 'tell application "Google Chrome" to bounds of window id ${{ raw: windowId }}'`.text()

  const [left, top, right, bottom] = output
    .trim()
    .split(",")
    .map((s) => parseInt(s.trim()))

  if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
    throw new Error(`Invalid window bounds: ${output}`)
  }

  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Делает скриншот окна Chrome
 */
export async function captureChromeWindow(windowId: string, outputPath: string) {
  const { x, y, width, height } = await getChromeWindowBounds(windowId)
  // -x: без звука, -R: регион
  await $`screencapture -x -R${x},${y},${width},${height} ${outputPath}`
}

/**
 * Проверяет размер окна и сохраняет скриншот при изменении
 */
export async function checkWindowSizeAndCapture(windowId: string, serviceName: string, storageDir: string) {
  const dataPath = `${storageDir}/data.json`
  const screenshotPath = `${storageDir}/${serviceName}.png`
  await $`mkdir -p ${storageDir}`
  const bounds = await getChromeWindowBounds(windowId)
  let data: Record<string, any> = {}
  const file = Bun.file(dataPath)
  if (await file.exists()) {
    try {
      data = await file.json()
    } catch (e) {}
  }
  const saved = data[serviceName]
  // Проверяем только размеры (width, height)
  const isSame = saved && saved.width === bounds.width && saved.height === bounds.height
  if (!isSame) {
    await focusChromeWindow(windowId)
    await captureChromeWindow(windowId, screenshotPath)
    data[serviceName] = {
      ...bounds,
      screenshot: screenshotPath,
      updatedAt: new Date().toISOString()
    }
    await Bun.write(dataPath, JSON.stringify(data, null, 2))
    return screenshotPath
  }
  return null
}