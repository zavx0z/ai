import type { NavigationHistory } from "../types/types"

export class HistoryManager {
  private history: NavigationHistory[] = []
  private currentIndex = -1
  private maxSize = 100

  constructor(maxSize?: number) {
    if (maxSize) {
      this.maxSize = maxSize
    }
  }

  add(path: string, cursorPosition: number = 0): void {
    // Удаляем все записи после текущего индекса
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Добавляем новую запись
    this.history.push({ path, cursorPosition })

    // Ограничиваем размер истории
    if (this.history.length > this.maxSize) {
      this.history.shift()
    } else {
      this.currentIndex = this.history.length - 1
    }
  }

  goBack(): NavigationHistory | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      const history = this.history[this.currentIndex]
      return history ?? null
    }
    return null
  }

  goForward(): NavigationHistory | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      const history = this.history[this.currentIndex]
      return history ?? null
    }
    return null
  }

  getCurrent(): NavigationHistory | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      const history = this.history[this.currentIndex]
      return history ?? null
    }
    return null
  }

  setCursorPosition(position: number): void {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      const history = this.history[this.currentIndex]
      if (history) {
        history.cursorPosition = position
      }
    }
  }

  getCursorPosition(): number {
    const current = this.getCurrent()
    return current ? current.cursorPosition : 0
  }

  getPath(): string {
    const current = this.getCurrent()
    return current ? current.path : ""
  }

  canGoBack(): boolean {
    return this.currentIndex > 0
  }

  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  getAll(): NavigationHistory[] {
    return [...this.history]
  }

  size(): number {
    return this.history.length
  }
}
