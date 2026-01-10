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
      console.log(`${Theme.bold}Навигация:${Theme.reset}`)
      console.log(`  ${Theme.cyan}k / ↑${Theme.reset}        - Вверх`)
      console.log(`  ${Theme.cyan}j / ↓${Theme.reset}        - Вниз`)
      console.log(`  ${Theme.cyan}l / Enter${Theme.reset}    - Выбрать`)
      console.log(`  ${Theme.cyan}h / q / Esc${Theme.reset}  - Назад`)
      console.log(`\n${Theme.gray}(Работает русская раскладка: л/о/д/р/й)${Theme.reset}`)
      console.log(`\n${Theme.gray}Нажмите любую клавишу...${Theme.reset}`)
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

      if (showHelp) {
        showHelp = false
        render()
        return
      }

      if (key === "?") {
        showHelp = true
        render()
        return
      }

      // Exit / Back: Esc, q (й), h (р)
      const isExit = key === Keys.ESC || key === "q" || key === "й" || key === "h" || key === "р"
      if (isExit) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      // Up: Arrow, k (л)
      const isUp = key === Keys.UP || key === "k" || key === "л"
      // Down: Arrow, j (о)
      const isDown = key === Keys.DOWN || key === "j" || key === "о"
      // Select: Enter, l (д)
      const isSelect = key === Keys.ENTER || key === "l" || key === "д"

      if (isUp) {
        idx = (idx - 1 + items.length) % items.length
        render()
      } else if (isDown) {
        idx = (idx + 1) % items.length
        render()
      } else if (isSelect) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        const selected = items[idx]
        resolve(selected || null)
      }
    }

    process.stdin.on("data", handler)
  }))
}