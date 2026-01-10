import { Theme } from "./theme"
import { Keys, withRawMode } from "./keyboard"

export async function select<T>(
  title: string, 
  items: T[], 
  format: (item: T) => string
): Promise<T | null> {
  let idx = 0

  const render = () => {
    Theme.clearScreen()
    Theme.printTitle(title)
    
    items.forEach((item, i) => {
      const line = format(item)
      if (i === idx) {
        console.log(`${Theme.selected}${Theme.cyan}${line}${Theme.reset}`)
      } else {
        console.log(`${Theme.unselected}${line}`)
      }
    })
    
    console.log(`\n${Theme.gray}↑/↓ Select | Enter Confirm | Esc Exit${Theme.reset}`)
  }

  return withRawMode(() => new Promise<T | null>((resolve) => {
    render()

    const handler = (key: string) => {
      if (key === Keys.CTRL_C) process.exit(0)
      
      if (key === Keys.ESC) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      if (key === Keys.UP) {
        idx = (idx - 1 + items.length) % items.length
        render()
      } else if (key === Keys.DOWN) {
        idx = (idx + 1) % items.length
        render()
      } else if (key === Keys.ENTER) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        // Проверяем существование элемента перед возвратом
        const selected = items[idx]
        if (selected) {
           resolve(selected)
        } else {
           resolve(null)
        }
      }
    }

    process.stdin.on("data", handler)
  }))
}