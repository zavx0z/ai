import { test, describe, expect } from "bun:test"
import { getChromeWindowsInfo } from "./window"
import { getChromeTabById } from "./tab"

describe("Google Chrome Tab by ID", () => {
  test("должен возвращать данные конкретной вкладки", async () => {
    const windows = await getChromeWindowsInfo()

    if (windows.length > 0 && windows[0]!.tabs.length > 0) {
      const targetTabId = windows[0]!.tabs[0]

      // Проверяем, что получили валидный ID
      if (targetTabId !== undefined) {
        const tab = await getChromeTabById(targetTabId)

        expect(tab).not.toBeNull()

        if (tab) {
          expect(tab.id).toBe(targetTabId)
          expect(typeof tab.title).toBe("string")
          expect(typeof tab.url).toBe("string")
          expect(typeof tab.active).toBe("boolean")
        }
      } else {
        console.warn("Тест пропущен: не удалось получить корректный ID вкладки")
      }
    } else {
      console.warn("Тест пропущен: нет открытых вкладок в Chrome")
    }
  })

  test("должен возвращать null для несуществующего tabId", async () => {
    const fakeTabId = 123456789
    const tab = await getChromeTabById(fakeTabId)
    expect(tab).toBeNull()
  })
})
