import { KeyMapper } from "../utils/KeyMapper"

export type InputCallback = (key: string, normalizedKey: string) => void

export class InputHandler {
  private callbacks: InputCallback[] = []

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
    this.handleNormalMode(key, normalizedKey)
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


  // Регистрация колбэков
  onInput(callback: InputCallback): void {
    this.callbacks.push(callback)
  }


  removeInputCallback(callback: InputCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback)
  }



  // Очистка
  cleanup(): void {
    process.stdin.setRawMode(false)
    process.stdin.removeAllListeners("data")
    this.callbacks = []
  }

  private triggerExit(): void {
    console.log("\n👋 Выход из программы...")
    this.cleanup()
    process.exit(0)
  }
}
