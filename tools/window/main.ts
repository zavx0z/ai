import { $ } from "bun"
/**
 * Получает список открытых окон Chrome
 * Исправлено: ID принудительно переводится в строку, чтобы избежать 1.56E+9
 */
export async function getChromeWindows(): Promise<{ id: string; title: string }[]> {
  const script = `
    const chrome = Application("Google Chrome");
    const results = [];
    
    // Используем стандартный обход окон, который у тебя работал
    const appWindows = chrome.windows();

    appWindows.forEach((win) => {
      try {
        // КРИТИЧНО: Формируем строку вручную или через String(), 
        // чтобы JSON.stringify не превратил число в 1.56E+9
        results.push({
          id: String(win.id()), 
          title: win.title() || "Без названия"
        });
      } catch (e) {}
    });

    JSON.stringify(results);
  `

  try {
    const response = await $`osascript -l JavaScript -e ${script}`.text()

    if (!response || response.trim() === "" || response.trim() === "null") {
      return []
    }

    const data = JSON.parse(response)

    return data.map((win: any) => ({
      // Теперь тут будет "1569844685", а не "1.569844685E+9"
      id: String(win.id).replace(/\D/g, ""),
      title: win.title.trim(),
    }))
  } catch (error) {
    console.error("Ошибка при получении списка окон Chrome:", error)
    return []
  }
}

export async function focusChromeWindow(targetId: string) {
  const script = `
    tell application "Google Chrome"
      -- Сохраняем ID нужного окна
      set targetWindowId to ${targetId}
      set foundWindow to missing value
      
      -- Ищем окно по ID
      repeat with w in windows
        if id of w is targetWindowId then
          set foundWindow to w
          exit repeat
        end if
      end repeat
      
      if foundWindow is missing value then
        -- Если окно не найдено, просто активируем Chrome
        activate
        return
      end if
      
      -- Активируем Chrome (это может переключить на Space с любым окном Chrome)
      activate
      delay 0.5
      
      -- Теперь переключаемся на нужное окно
      -- Используем Mission Control для просмотра всех окон Chrome
      tell application "System Events"
        -- Сочетание клавиш для Mission Control приложения (по умолчанию Ctrl+Down)
        try
          key code 125 using {control down}
          delay 0.5
          
          -- Нажимаем Tab для навигации по окнам
          -- Или используем стрелки
          key code 48 -- Tab
          delay 0.1
          key code 48 -- Tab
          delay 0.1
          
          -- Нажимаем Enter для выбора
          key code 36 -- Enter
        on error
          -- Если не сработало, просто пытаемся поднять окно
          tell process "Google Chrome"
            set frontmost to true
          end tell
        end try
      end tell
      
      -- Поднимаем окно на передний план
      delay 0.3
      set index of foundWindow to 1
    end tell
  `;

  await $`osascript -e ${script}`;
}
if (import.meta.main) {
  const windows = await getChromeWindows()
  console.log(windows)
  await focusChromeWindow(windows[2]!.id)
}
