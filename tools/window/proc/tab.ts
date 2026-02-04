import { $ } from "bun"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ChromeTab } from "./tab.t"
import { unlink } from "node:fs/promises"

export async function getChromeTabById(tabId: number): Promise<ChromeTab | null> {
  const scriptPath = join(tmpdir(), `chrome_tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.scpt`)

  const script = `
tell application "Google Chrome"
  set targetIdStr to "${tabId}"
  set resultJSON to ""
  
  repeat with w in windows
    set tabCount to count of tabs of w
    set activeTabIndex to active tab index of w
    
    repeat with i from 1 to tabCount
      try
        set t to tab i of w
        set currentIdStr to (id of t) as string
        
        if currentIdStr = targetIdStr then
          set tabTitle to title of t
          set tabUrl to URL of t
          set isActive to (i = activeTabIndex)
          
          -- Экранируем для безопасного JSON
          set AppleScript's text item delimiters to "\\\\"
          set tabTitle to text items of tabTitle as string
          set tabUrl to text items of tabUrl as string
          
          set AppleScript's text item delimiters to "\\""
          set tabTitle to text items of tabTitle as string
          set tabUrl to text items of tabUrl as string
          
          set AppleScript's text item delimiters to ""
          
          set resultJSON to "{\\"id\\":" & (id of t) & ",\\"index\\":" & i & ",\\"title\\":\\"" & tabTitle & "\\",\\"url\\":\\"" & tabUrl & "\\",\\"active\\":" & isActive & "}"
          exit repeat
        end if
      end try
    end repeat
    if resultJSON is not "" then exit repeat
  end repeat
  
  return resultJSON
end tell
`

  try {
    await Bun.write(scriptPath, script)
    const result = await $`osascript ${scriptPath}`.text()
    const trimmed = result.trim()

    if (!trimmed || trimmed === "") {
      return null
    }

    const parsed = JSON.parse(trimmed)

    return {
      id: Number(parsed.id),
      index: parsed.index,
      title: parsed.title,
      url: parsed.url,
      active: parsed.active,
    }
  } catch (error) {
    console.error("Error getting Chrome tab by ID:", error)
    return null
  } finally {
    try {
      await unlink(scriptPath)
    } catch {}
  }
}
