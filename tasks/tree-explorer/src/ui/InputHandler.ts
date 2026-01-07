import { KeyMapper } from "../utils/KeyMapper"

export type InputCallback = (key: string, normalizedKey: string) => void

export class InputHandler {
  private callbacks: InputCallback[] = []
  private inFilterMode = false
  private filterCallbacks: InputCallback[] = []

  constructor() {
    this.setupInput()
  }

  private setupInput(): void {
    process.stdin.setRawMode(true)
    process.stdin.setEncoding("utf8")
    process.stdin.resume()

    process.stdin.on("data", (key) => {
      this.handleKeyPress(key.toString())
    })
  }

  private handleKeyPress(key: string): void {
    const normalizedKey = KeyMapper.convertRussianKey(key)

    if (this.inFilterMode) {
      this.handleFilterMode(key, normalizedKey)
    } else {
      this.handleNormalMode(key, normalizedKey)
    }
  }

  private handleNormalMode(key: string, normalizedKey: string): void {
    // Ctrl+C для выхода
    if (key === "\u0003" || normalizedKey === "q" || normalizedKey === "й") {
      this.triggerExit()
      return
    }

    // Вызываем все зарегистрированные колбэки
    this.callbacks.forEach((callback) => callback(key, normalizedKey))
  }

  private handleFilterMode(key: string, normalizedKey: string): void {
    // В режиме фильтра вызываем специальные колбэки
    this.filterCallbacks.forEach((callback) => callback(key, normalizedKey))
  }

  // Регистрация колбэков
  onInput(callback: InputCallback): void {
    this.callbacks.push(callback)
  }

  onFilterInput(callback: InputCallback): void {
    this.filterCallbacks.push(callback)
  }

  removeInputCallback(callback: InputCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback)
  }

  removeFilterCallback(callback: InputCallback): void {
    this.filterCallbacks = this.filterCallbacks.filter((cb) => cb !== callback)
  }

  // Управление режимами
  enterFilterMode(): void {
    this.inFilterMode = true
  }

  exitFilterMode(): void {
    this.inFilterMode = false
  }

  isInFilterMode(): boolean {
    return this.inFilterMode
  }

  // Очистка
  cleanup(): void {
    process.stdin.setRawMode(false)
    process.stdin.removeAllListeners("data")
    this.callbacks = []
    this.filterCallbacks = []
  }

  private triggerExit(): void {
    console.log("\n👋 Выход из программы...")
    this.cleanup()
    process.exit(0)
  }
}
