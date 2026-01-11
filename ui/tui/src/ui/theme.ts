import { Ansi } from "tui-base"

export const Theme = {
  reset: Ansi.RESET,
  cyan: Ansi.CYAN,
  green: Ansi.GREEN,
  yellow: Ansi.YELLOW,
  red: Ansi.RED,
  gray: Ansi.GRAY,
  bold: Ansi.BOLD,
  
  selected: Ansi.CYAN + "❯ " + Ansi.BOLD,
  unselected: "  ",
  
  printTitle: (title: string) => {
    console.log(`\n${Ansi.BOLD}🤖 AI Tool Wrapper${Ansi.RESET}`)
    console.log(`${Ansi.YELLOW}${title}${Ansi.RESET}\n`)
  },
  
  clearScreen: () => {
    Ansi.clear()
  }
}