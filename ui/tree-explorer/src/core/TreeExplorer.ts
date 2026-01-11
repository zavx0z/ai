import { existsSync } from "fs"
import { mkdir } from "fs/promises"
import { join, dirname, resolve } from "path"
import { FileSystem } from "./FileSystem"
import { HistoryManager } from "./HistoryManager"
import { SelectionManager } from "./SelectionManager"
import { ExcludePatterns } from "../utils/ExcludePatterns"
import { Renderer } from "../ui/Renderer"
import { InputHandler, type InputCallback } from "../ui/InputHandler"
import type { FileEntry, RenderOptions, AppConfig } from "../types/types"

export class TreeExplorer {
  // Основные менеджеры
  private history: HistoryManager
  private selection: SelectionManager
  private excludePatterns: ExcludePatterns
  private renderer: Renderer
  private inputHandler: InputHandler

  // Конфигурация
  private config: AppConfig

  // Состояние приложения
  private currentPath: string
  private entries: FileEntry[] = []
  private cursorPosition = 0
  private showHidden = false
  private filter = ""
  private filterBuffer = ""
  private inFilterMode = false
  private isRunning = true

  constructor(startPath: string = process.cwd(), excludePatterns: string[] = [], config?: AppConfig) {
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
    this.config = config || {}

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
    // Vim navigation (hjkl) + Arrows
    if (key === "\u001b[A" || normalizedKey === "k") {
      // Up
      this.moveCursor(-1)
    } else if (key === "\u001b[B" || normalizedKey === "j") {
      // Down
      this.moveCursor(1)
    } else if (key === "\u001b[C" || key === "\r" || normalizedKey === "l") {
      // Right / Enter
      this.enterDirectory()
    } else if (key === "\u001b[D" || normalizedKey === "h") {
      // Left / Back
      this.goBack()
    }
    // Selection
    else if (key === " ") {
      this.toggleSelection()
    } else if (normalizedKey === "a") {
      this.selectAllRecursively()
    } else if (normalizedKey === "A") {
      this.selectAllCompletely()
    } else if (normalizedKey === "d") {
      this.selection.deselectAll()
      this.render()
    }
    // Tools
    else if (normalizedKey === ".") {
      // Toggle hidden (dotfiles)
      this.toggleHidden()
    } else if (normalizedKey === "f") {
      this.enterFilterMode()
    } else if (normalizedKey === "s") {
      this.showSelected()
    } else if (normalizedKey === "e") {
      this.showExcludeInfo()
    } else if (normalizedKey === "w") {
      // Write to JSON
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
      if (normalizedKey === "w") {
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

      // Создаем новый формат JSON: только абсолютные пути к регулярным файлам (не директории и не симлинки)
      const { resolve } = await import("path")

      // Отфильтруем только регулярные файлы
      const filePaths = []
      for (const file of files) {
        const absolutePath = resolve(file)
        const entry = await FileSystem.getFileEntry(absolutePath)
        if (entry && !entry.isDirectory && !entry.isSymlink) {
          filePaths.push(absolutePath)
        }
      }
      
      // Формируем простой массив абсолютных путей без статистики и имен файлов
      const data = filePaths

      // Определяем путь для сохранения (из конфигурации или генерируем с временной меткой)
      let filePath: string
      let filename: string
      
      if (this.config.outputFile) {
        // Используем путь из конфигурации
        filePath = resolve(this.config.outputFile)
        filename = filePath.split(/[\\/]/).pop() || 'output.json'
        
        // Создаем родительскую директорию, если она не существует
        const parentDir = dirname(filePath)
        if (parentDir !== '.') {
          try {
            await mkdir(parentDir, { recursive: true })
          } catch (error) {
            console.error(`❌ Не удалось создать директорию ${parentDir}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      } else {
        // Генерируем имя файла с временной меткой
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
        filename = `selected-files-${timestamp}.json`
        filePath = join(this.currentPath, filename)
      }

      // Записываем файл - простой массив абсолютных путей
      await Bun.write(filePath, JSON.stringify(data, null, 2))

      // Показываем сообщение об успехе
      const theme = this.renderer["theme"]
      const message = "\x1b[2J\x1b[H" + 
        (theme["successText"] ? theme["successText"]("✅ Список файлов сохранен!") : "✅ Список файлов сохранен!") + "\n\n" +
        (theme["cyan"] || "") + `Файл: ${filename}` + "\n" +
        (theme["cyan"] || "") + `Путь: ${filePath}` + "\n" +
        (theme["cyan"] || "") + `Количество: ${data.length} файлов` + "\n\n" +
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
