import { test, describe, expect } from "bun:test"
import { getChromeWindowsInfo } from "./window"

describe("Google Chrome Window Info", () => {
  test("должен возвращать массив (даже если Chrome закрыт)", async () => {
    const windows = await getChromeWindowsInfo()
    expect(Array.isArray(windows)).toBe(true)
  })

  test("структура объектов должна соответствовать интерфейсу ChromeWindow", async () => {
    const windows = await getChromeWindowsInfo()

    // Если окна открыты, проверяем первое попавшееся
    if (windows.length > 0) {
      const win = windows[0]!

      // Проверка типов
      expect(typeof win.id).toBe("number")
      expect(typeof win.index).toBe("number")
      expect(typeof win.x).toBe("number")
      expect(typeof win.y).toBe("number")
      expect(typeof win.width).toBe("number")
      expect(typeof win.height).toBe("number")

      // Проверка массива вкладок
      expect(Array.isArray(win.tabs)).toBe(true)
      if (win.tabs.length > 0) {
        expect(typeof win.tabs[0]).toBe("number")
      }
    }
  })

  test("координаты и размеры должны быть валидными", async () => {
    const windows = await getChromeWindowsInfo()

    if (windows.length > 0) {
      for (const win of windows) {
        // Ширина и высота не могут быть отрицательными или нулевыми в нормальном состоянии
        expect(win.width).toBeGreaterThan(0)
        expect(win.height).toBeGreaterThan(0)

        // Обычно macOS окна начинаются с y >= 25 (высота меню-бара)
        expect(win.y).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test("каждое окно должно иметь уникальный ID", async () => {
    const windows = await getChromeWindowsInfo()

    if (windows.length > 1) {
      const ids = windows.map((w) => w.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    }
  })
})
