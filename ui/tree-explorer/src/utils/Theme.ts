import type { ColorTheme } from "../types/types"
import { Ansi } from "tui-base"

export class Theme extends Ansi implements ColorTheme {
  reset = Ansi.RESET
  bold = Ansi.BOLD
  cyan = Ansi.CYAN
  green = Ansi.GREEN
  yellow = Ansi.YELLOW
  blue = Ansi.BLUE
  magenta = Ansi.MAGENTA
  red = Ansi.RED
  gray = Ansi.GRAY
  bgSelected = Ansi.BG_SELECTED
  bgCursor = Ansi.BG_CURSOR

  // Дополнительные стили
  get header() {
    return this.bold + this.cyan
  }

  get success() {
    return this.green
  }

  get warning() {
    return this.yellow
  }

  get error() {
    return this.red
  }

  get directory() {
    return this.blue
  }

  get symlink() {
    return this.cyan
  }

  get disabled() {
    return this.gray
  }

  // Методы для создания строк со стилями
  headerText(text: string): string {
    return this.header + text + this.reset
  }

  successText(text: string): string {
    return this.success + text + this.reset
  }

  errorText(text: string): string {
    return this.error + text + this.reset
  }
}