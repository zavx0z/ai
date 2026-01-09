import { existsSync } from "fs"
import { FileSystem } from "./FileSystem"
import { HistoryManager } from "./HistoryManager"
import { SelectionManager } from "./SelectionManager"
import { ExcludePatterns } from "../utils/ExcludePatterns"
import { Renderer } from "../ui/Renderer"
import { InputHandler, type InputCallback } from "../ui/InputHandler"
import type { FileEntry, RenderOptions } from "../types/types"

export class TreeExplorer {
  // Основные менеджеры
  private history: HistoryManager
  private selection: SelectionManager
  private excludePatterns: ExcludePatterns
  private renderer: Renderer
  private inputHandler: InputHandler

  // Состояние приложения
  private currentPath: string
  private entries: FileEntry[] = []
  private cursorPosition = 0
  private showHidden = false
  private filter = ""
  private filterBuffer = ""
  private inFilterMode = false
  private isRunning = true

  constructor(startPath: string = process.cwd(), excludePatterns: string[] = []) {
    // Проверка платформы
    if (process.platform === "win32") {
      console.error("❌ Не поддерживается на Windows")
      process.exit(1)
    }

    // Инициализация пути
    this.currentPath = this.validateStartPath(startPath)

    // Инициализация менеджеров
    this.excludePatterns = new ExcludePatterns(excludePatterns)
    this.selection = new SelectionManager(this.excludePatterns)
    this.history = new HistoryManager()
    this.renderer = new Renderer(this.selection)
    this.inputHandler = new InputHandler()

    // Добавляем начальную точку в историю
    this.history.add(this.currentPath, 0)

    // Настройка обработки ввода
    this.setupInputHandlers()
    this.setupSignalHandlers()
  }

  // Основной метод запуска
  async run(): Promise<void> {
    try {
      console.log("🚀 Tree Explorer запущен...\n")

      // Первоначальная загрузка и отрисовка
      await this.loadEntries()
      this.render()

      // Главный цикл
      await this.mainLoop()
    } catch (error) {
      console.error("🔥 Ошибка:", error instanceof Error ? error.message : String(error))
      this.cleanup()
      process.exit(1)
    }
  }

  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      await Bun.sleep(50) // Небольшая пауза для CPU
    }
  }

  // Загрузка файлов из текущей директории
  private async loadEntries(): Promise<void> {
    try {
      const allEntries = await FileSystem.readDirectory(this.currentPath)

      // Фильтрация
      this.entries = allEntries.filter((entry) => {
        // Скрытые файлы
        if (!this.showHidden && entry.name.startsWith(".")) {
          return false
        }

        // Фильтр по имени
        if (this.filter && !entry.name.toLowerCase().includes(this.filter.toLowerCase())) {
          return false
        }

        // Исключения
        if (this.excludePatterns.isExcluded(entry.path, this.currentPath)) {
          return false
        }

        return true
      })

      // Сортировка: директории первыми
      this.entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      // Корректировка позиции курсора
      if (this.cursorPosition >= this.entries.length) {
        this.cursorPosition = Math.max(0, this.entries.length - 1)
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки директории: ${error instanceof Error ? error.message : String(error)}`)
      this.entries = []

      // Пробуем перейти в домашнюю директорию
      const homeDir = process.env.HOME || "/"
      if (homeDir !== this.currentPath) {
        this.currentPath = homeDir
        this.history.add(this.currentPath, 0)
        return this.loadEntries()
      }
    }
  }

  // Отрисовка интерфейса
  private render(): void {
    const options: RenderOptions = {
      showHidden: this.showHidden,
      filter: this.filter,
      inFilterMode: this.inFilterMode,
      filterBuffer: this.filterBuffer,
      excludePatterns: this.excludePatterns.getPatterns(),
    }

    const output = this.renderer.renderInterface(this.currentPath, this.entries, this.cursorPosition, options)

    process.stdout.write(output)
  }

  // Настройка обработчиков ввода
  private setupInputHandlers(): void {
    this.inputHandler.onInput(this.handleNormalInput.bind(this))
    this.inputHandler.onFilterInput(this.handleFilterInput.bind(this))
  }

  private handleNormalInput(key: string, normalizedKey: string): void {
    // Навигация
    if (key === "\u001b[A") {
      // Стрелка вверх
      this.moveCursor(-1)
    } else if (key === "\u001b[B") {
      // Стрелка вниз
      this.moveCursor(1)
    } else if (key === "\u001b[C" || key === "\r") {
      // Стрелка вправо или Enter
      this.enterDirectory()
    } else if (key === "\u001b[D") {
      // Стрелка влево
      this.goBack()
    }
    // Выбор
    else if (key === " ") {
      // Пробел
      this.toggleSelection()
    } else if (normalizedKey === "a" || normalizedKey === "ф") {
      // ВЫБРАТЬ ВСЁ (РЕКУРСИВНО) - ИСПРАВЛЕННЫЙ ВАРИАНТ
      this.selectAllRecursively()
    } else if (normalizedKey === "A") {
      // Выбрать всё (полностью)
      this.selectAllCompletely()
    } else if (normalizedKey === "d" || normalizedKey === "в") {
      // Снять выбор
      this.selection.deselectAll()
      this.render()
    }
    // Настройки
    else if (normalizedKey === "h" || normalizedKey === "р") {
      // Скрытые файлы
      this.toggleHidden()
    } else if (normalizedKey === "f" || normalizedKey === "а") {
      // Фильтр
      this.enterFilterMode()
    } else if (normalizedKey === "s" || normalizedKey === "ы") {
      // Показать выбранное
      this.showSelected()
    } else if (normalizedKey === "e" || normalizedKey === "у") {
      // Исключения
      this.showExcludeInfo()
    } else if (normalizedKey === "j" || normalizedKey === "о") {
      // Сохранить выбранное в JSON
      this.saveSelectionToJson()
    }
  }
  private async selectAllRecursively(): Promise<void> {
    try {
      // Сначала выбираем всё что видно на экране
      this.selection.selectAll(this.entries)

      // Затем рекурсивно выбираем содержимое всех директорий
      const directories = this.entries.filter(
        (entry) => entry && entry.isDirectory && !this.excludePatterns.isExcluded(entry.path)
      )

      for (const dir of directories) {
        await this.selection.selectDirectory(dir.path)
      }

      this.render()
    } catch (error) {
        console.error(`❌ Ошибка при выборе всего: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  private handleFilterInput(key: string, normalizedKey: string): void {
    if (key === "\r") {
      // Enter
      this.filter = this.filterBuffer
      this.filterBuffer = ""
      this.inputHandler.exitFilterMode()
      this.inFilterMode = false
      this.reloadAndRender()
    } else if (key === "\u001b") {
      // Esc
      this.filterBuffer = ""
      this.inputHandler.exitFilterMode()
      this.inFilterMode = false
      this.reloadAndRender()
    } else if (key === "\x7f") {
      // Backspace
      if (this.filterBuffer.length > 0) {
        this.filterBuffer = this.filterBuffer.slice(0, -1)
        this.render()
      }
    } else if (key.length === 1 && key.match(/[a-zA-Z0-9 _\-\.а-яА-Я]/)) {
      this.filterBuffer += key
      this.render()
    }
  }

  // Методы навигации
  private moveCursor(delta: number): void {
    const newPos = this.cursorPosition + delta
    if (newPos >= 0 && newPos < this.entries.length) {
      this.cursorPosition = newPos
      this.render()
    }
  }

  private async enterDirectory(): Promise<void> {
    if (this.entries.length === 0) return

      const entry = this.entries[this.cursorPosition]
      if (entry && entry.isDirectory) {
        try {
          this.currentPath = entry.path
          this.history.add(this.currentPath, 0)
          this.cursorPosition = 0
          await this.loadEntries()
          this.render()
        } catch (error) {
          console.error(`❌ Не удалось войти в директорию: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
  }

  private async goBack(): Promise<void> {
    const previous = this.history.goBack()
    if (previous) {
      this.currentPath = previous.path
      this.cursorPosition = previous.cursorPosition
      await this.loadEntries()
      this.render()
    }
  }

  // Методы выбора
  private async toggleSelection(): Promise<void> {
    if (this.entries.length === 0) return

    const entry = this.entries[this.cursorPosition]
    if (!entry) return
    
    if (entry.isDirectory) {
      await this.selection.toggleDirectory(entry.path)
    } else {
      this.selection.toggle(entry.path)
    }
    this.render()
  }

  private async selectAllExcluding(): Promise<void> {
    this.selection.selectAll(this.entries)
    this.render()
  }

  private async selectAllCompletely(): Promise<void> {
    this.selection.selectAllIncludingExcluded(this.entries)
    this.render()
  }

  // Методы настройки
  private async toggleHidden(): Promise<void> {
    this.showHidden = !this.showHidden
    await this.loadEntries()
    this.render()
  }

  private enterFilterMode(): void {
    this.inFilterMode = true
    this.filterBuffer = this.filter
    this.inputHandler.enterFilterMode()
    this.render()
  }

  // Специальные экраны
  private showSelected(): void {
    const selectedFiles = this.selection.getSelectedFiles()
    const output = this.renderer.renderSelectedFilesScreen(selectedFiles)
    process.stdout.write(output)

    // Временный обработчик для возврата и сохранения
    const returnHandler = (key: string, normalizedKey: string) => {
      if (normalizedKey === "j" || normalizedKey === "о") {
        // Сохраняем в JSON
        this.saveSelectionToJson(selectedFiles)
      } else {
        // Возвращаемся к основному интерфейсу
        this.inputHandler.removeInputCallback(returnHandler)
        this.render()
      }
    }

    this.inputHandler.onInput(returnHandler)
  }

  private showExcludeInfo(): void {
    const patterns = this.excludePatterns.getPatterns()
    const output = this.renderer.renderExcludeInfoScreen(patterns)
    process.stdout.write(output)

    // Временный обработчик для возврата
    const returnHandler = (key: string) => {
      this.inputHandler.removeInputCallback(returnHandler)
      this.render()
    }

    this.inputHandler.onInput(returnHandler)
  }

  // Новый метод: Сохранить выбранные файлы в JSON
  private async saveSelectionToJson(selectedFiles?: string[]): Promise<void> {
    try {
      const files = selectedFiles || this.selection.getSelectedFiles()
      
      if (files.length === 0) {
        const theme = this.renderer["theme"]
        const message = "\x1b[2J\x1b[H" + 
          (theme["errorText"] ? theme["errorText"]("❌ Файлы не выбраны") : "❌ Файлы не выбраны") + "\n\n" +
          (theme["yellow"] || "") + "Нажмите любую клавишу для продолжения..." + 
          (theme["reset"] || "")
        
        process.stdout.write(message)
        
        // Ждем нажатия любой клавиши
        await new Promise<void>((resolve) => {
          const handler = () => {
            this.inputHandler.removeInputCallback(handler)
            this.render()
            resolve()
          }
          this.inputHandler.onInput(handler)
        })
        return
      }

      // Создаем структурированный объект
      const data = {
        generated: new Date().toISOString(),
        totalFiles: files.length,
        directory: this.currentPath,
        files: files.map(file => ({
          path: file,
          name: file.split(/[\\/]/).pop() || file,
          isDirectory: file.endsWith("/") || (!file.includes(".") && !file.includes("/"))
        }))
      }

      // Создаем имя файла с временной меткой
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `selected-files-${timestamp}.json`
      const filePath = `${this.currentPath}/${filename}`

      // Записываем файл
      await Bun.write(filePath, JSON.stringify(data, null, 2))

      // Показываем сообщение об успехе
      const theme = this.renderer["theme"]
      const message = "\x1b[2J\x1b[H" + 
        (theme["successText"] ? theme["successText"]("✅ Список файлов сохранен!") : "✅ Список файлов сохранен!") + "\n\n" +
        (theme["cyan"] || "") + `Файл: ${filename}` + "\n" +
        (theme["cyan"] || "") + `Путь: ${filePath}` + "\n" +
        (theme["cyan"] || "") + `Количество: ${files.length} файлов` + "\n\n" +
        (theme["yellow"] || "") + "Нажмите любую клавишу для продолжения..." + 
        (theme["reset"] || "")
      
      process.stdout.write(message)
      
      // Ждем нажатия любой клавиши
      await new Promise<void>((resolve) => {
        const handler = () => {
          this.inputHandler.removeInputCallback(handler)
          this.render()
          resolve()
        }
        this.inputHandler.onInput(handler)
      })
      
    } catch (error) {
      const theme = this.renderer["theme"]
      const message = "\x1b[2J\x1b[H" + 
        (theme["errorText"] ? theme["errorText"]("❌ Ошибка сохранения") : "❌ Ошибка сохранения") + "\n\n" +
        (theme["red"] || "") + (error instanceof Error ? error.message : String(error)) + "\n\n" +
        (theme["yellow"] || "") + "Нажмите любую клавишу для продолжения..." + 
        (theme["reset"] || "")
      
      process.stdout.write(message)
      
      // Ждем нажатия любой клавиши
      await new Promise<void>((resolve) => {
        const handler = () => {
          this.inputHandler.removeInputCallback(handler)
          this.render()
          resolve()
        }
        this.inputHandler.onInput(handler)
      })
    }
  }

  // Вспомогательные методы
  private async reloadAndRender(): Promise<void> {
    await this.loadEntries()
    this.render()
  }

  private validateStartPath(startPath: string): string {
    if (existsSync(startPath)) {
      return startPath
    }
    console.log(`⚠️  Путь "${startPath}" не существует. Использую текущую директорию.`)
    return process.cwd()
  }

  private setupSignalHandlers(): void {
    ;["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
      process.on(signal, () => {
        console.log("\n📶 Получен сигнал завершения...")
        this.exitGracefully()
      })
    })
  }

  private exitGracefully(): void {
    this.isRunning = false

    console.log("\n👋 Выход из Tree Explorer")

    if (this.selection.getSelectedCount() > 0) {
      console.log(`\n✅ Выбрано файлов: ${this.selection.getSelectedCount()}`)
      this.selection.getSelectedFiles().forEach((file) => {
        console.log(`  ${file}`)
      })
    }

    this.cleanup()
    process.exit(0)
  }

  private cleanup(): void {
    this.inputHandler.cleanup()
  }
}
