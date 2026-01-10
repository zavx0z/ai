import { Theme } from "./theme"
import { Keys, withRawMode } from "./keyboard"

export async function select<T>(
  title: string,
  items: T[],
  format: (item: T) => string
): Promise<T | null> {
  let idx = 0
  let showHelp = false

  const render = () => {
    Theme.clearScreen()
    
    if (showHelp) {
      Theme.printTitle("Справка по управлению")
      console.log(`${Theme.bold}Клавиши:${Theme.reset}`)
      console.log(`  ${Theme.cyan}↑ / k / л${Theme.reset}    - Вверх`)
      console.log(`  ${Theme.cyan}↓ / j / о${Theme.reset}    - Вниз`)
      console.log(`  ${Theme.cyan}Enter${Theme.reset}        - Выбрать`)
      console.log(`  ${Theme.cyan}Esc${Theme.reset}          - Назад / Выход`)
      console.log(`  ${Theme.cyan}?${Theme.reset}            - Закрыть справку`)
      console.log(`\n${Theme.gray}Нажмите любую клавишу для возврата...${Theme.reset}`)
      return
    }

    Theme.printTitle(title)

    items.forEach((item, i) => {
      const line = format(item)
      if (i === idx) {
        console.log(`${Theme.selected}${Theme.cyan}${line}${Theme.reset}`)
      } else {
        console.log(`${Theme.unselected}${line}`)
      }
    })

    console.log(`\n${Theme.gray}[?] Справка${Theme.reset}`)
  }

  return withRawMode(() => new Promise<T | null>((resolve) => {
    render()

    const handler = (key: string) => {
      if (key === Keys.CTRL_C) process.exit(0)

      // Режим справки
      if (showHelp) {
        showHelp = false
        render()
        return
      }

      // Включение справки
      if (key === "?") {
        showHelp = true
        render()
        return
      }

      if (key === Keys.ESC) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      // Навигация (Стрелки + Vim + Русская раскладка)
      const isUp = key === Keys.UP || key === "k" || key === "л"
      const isDown = key === Keys.DOWN || key === "j" || key === "о"

      if (isUp) {
        idx = (idx - 1 + items.length) % items.length
        render()
      } else if (isDown) {
        idx = (idx + 1) % items.length
        render()
      } else if (key === Keys.ENTER) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        const selected = items[idx]
        resolve(selected || null)
      }
    }

    process.stdin.on("data", handler)
  }))
}