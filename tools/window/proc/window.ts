import { $ } from "bun"
import type { ChromeWindow } from "./window.t"
import { unlink } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

export async function getChromeWindowsInfo(): Promise<ChromeWindow[]> {
  const scriptPath = join(tmpdir(), `chrome_windows_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.scpt`)

  const script = `
tell application "Google Chrome"
  set output to ""
  set firstWindow to true
  
  repeat with w in windows
    set b to bounds of w
    
    -- Собираем данные всех вкладок
    set tabIds to ""
    set firstTab to true
    repeat with t in tabs of w
      if firstTab is false then
        set tabIds to tabIds & ","
      end if
      set tabIds to tabIds & (id of t)
      set firstTab to false
    end repeat
    
    if firstWindow is false then
      set output to output & ","
    end if
    set output to output & "{\\"id\\":" & (id of w) & ",\\"index\\":" & (index of w) & ",\\"bounds\\":[" & (item 1 of b) & "," & (item 2 of b) & "," & (item 3 of b) & "," & (item 4 of b) & "],\\"tabs\\":[" & tabIds & "]}"
    set firstWindow to false
  end repeat
  
  return "[" & output & "]"
end tell
`

  try {
    await Bun.write(scriptPath, script)
    const response = await $`osascript ${scriptPath}`.text()

    if (!response.trim()) return []

    const windows = JSON.parse(response)

    return windows.map((win: any) => {
      const [x1, y1, x2, y2] = win.bounds
      return {
        id: Number(win.id),
        index: win.index,
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
        tabs: win.tabs.map((id: any) => Number(id)), // Преобразуем в числа
      }
    })
  } catch (error) {
    console.error("Ошибка при получении окон Chrome:", error)
    return []
  } finally {
    try {
      await unlink(scriptPath)
    } catch {}
  }
}
