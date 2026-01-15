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
  },

  getTextWidth: (str: string): number => {
    const clean = str.replace(/\u001b\[[0-9;]*m/g, "");
    let width = 0;
    for (const char of clean) {
      const code = char.codePointAt(0) || 0;
      // Эмодзи и широкие символы обычно занимают 2 колонки.
      // Сюда входят суррогатные пары (>0xffff) и иконки типа ⚡ (0x26A1)
      if (code > 0xffff || (code >= 0x2600 && code <= 0x27bf)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }
}