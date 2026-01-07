import type { ColorTheme } from "../types/types"

export class Theme implements ColorTheme {
  reset = "\x1b[0m"
  bold = "\x1b[1m"
  cyan = "\x1b[36m"
  green = "\x1b[32m"
  yellow = "\x1b[33m"
  blue = "\x1b[34m"
  magenta = "\x1b[35m"
  red = "\x1b[31m"
  gray = "\x1b[90m"
  bgSelected = "\x1b[48;5;238m"
  bgCursor = "\x1b[48;5;240m"

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
