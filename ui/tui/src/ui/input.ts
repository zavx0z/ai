import { Theme } from "./theme"
import { Keys, withRawMode } from "./keyboard"

export async function input(title: string): Promise<string | null> {
  let value = ""

  const render = () => {
    Theme.clearScreen()
    Theme.printTitle(title)
    console.log(`${Theme.green}❯ ${value}${Theme.reset}_`)
    console.log(`\n${Theme.gray}Enter - подтвердить, Esc - отмена${Theme.reset}`)
  }

  return withRawMode(() => new Promise<string | null>((resolve) => {
    render()

    const handler = (key: string) => {
      if (key === Keys.CTRL_C) process.exit(0)

      if (key === Keys.ESC) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      if (key === Keys.ENTER) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(value)
        return
      }

      if (key === "\x7f") { // Backspace
        value = value.slice(0, -1)
        render()
        return
      }

      // Simple printable char check
      if (key.length === 1 && key >= " ") {
        value += key
        render()
      }
    }

    process.stdin.on("data", handler)
  }))
}