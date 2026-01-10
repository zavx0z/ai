import { FileSystem } from "./FileSystem"
import { ExcludePatterns } from "../utils/ExcludePatterns"
import type { FileEntry } from "../types/types"

export class SelectionManager {
  private selectedFiles: Set<string> = new Set()
  private excludePatterns: ExcludePatterns

  constructor(excludePatterns?: ExcludePatterns) {
    this.excludePatterns = excludePatterns || new ExcludePatterns()
  }

  // Основные методы выбора
  select(path: string): void {
    this.selectedFiles.add(path)
  }

  deselect(path: string): void {
    this.selectedFiles.delete(path)
  }

  toggle(path: string): void {
    if (this.isSelected(path)) {
      this.deselect(path)
    } else {
      this.select(path)
    }
  }

  isSelected(path: string): boolean {
    return this.selectedFiles.has(path)
  }

  // Рекурсивные операции
  async selectDirectory(dirPath: string): Promise<void> {
    try {
      // Добавляем саму директорию
      this.select(dirPath)

      // Рекурсивно добавляем все файлы внутри
      const allFiles = await FileSystem.getAllFilesInDirectory(dirPath)

      for (const file of allFiles) {
        if (!this.excludePatterns.isExcluded(file)) {
          this.select(file)
        }
      }
    } catch (error) {
      throw new Error(`Не удалось выбрать директорию ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deselectDirectory(dirPath: string): Promise<void> {
    // Удаляем саму директорию
    this.deselect(dirPath)

    // Удаляем все файлы внутри
    const filesToRemove: string[] = []

    for (const file of this.selectedFiles) {
      if (file.startsWith(dirPath + "/") || file.startsWith(dirPath + "\\")) {
        filesToRemove.push(file)
      }
    }

    for (const file of filesToRemove) {
      this.deselect(file)
    }
  }

  async toggleDirectory(dirPath: string): Promise<void> {
    const isFullySelected = await this.isDirectoryFullySelected(dirPath)

    if (isFullySelected) {
      await this.deselectDirectory(dirPath)
    } else {
      await this.selectDirectory(dirPath)
    }
  }

  async isDirectoryFullySelected(dirPath: string): Promise<boolean> {
    try {
      const allFiles = await FileSystem.getAllFilesInDirectory(dirPath)
      const filteredFiles = allFiles.filter((file) => !this.excludePatterns.isExcluded(file))

      if (filteredFiles.length === 0) {
        return this.isSelected(dirPath)
      }

      // Проверяем выбрана ли сама директория
      if (this.isSelected(dirPath)) {
        return true
      }

      // Проверяем выбраны ли все файлы внутри
      for (const file of filteredFiles) {
        if (!this.isSelected(file)) {
          return false
        }
      }

      return true
    } catch {
      return false
    }
  }

  // Пакетные операции
  selectAll(entries: FileEntry[]): void {
    for (const entry of entries) {
      if (!this.excludePatterns.isExcluded(entry.path)) {
        this.select(entry.path)
      }
    }
  }

  // НОВЫЙ МЕТОД: Выбрать всё рекурсивно
  async selectAllRecursively(): Promise<void> {
    // Для каждой директории в выбранных файлах
    const directories = Array.from(this.selectedFiles).filter((path) => {
      try {
        // Проверяем, является ли путь директорией
        return path.endsWith("/") || (path.includes(".") ? false : true) // Простая эвристика
      } catch {
        return false
      }
    })

    for (const dirPath of directories) {
      if (!this.excludePatterns.isExcluded(dirPath)) {
        await this.selectDirectory(dirPath)
      }
    }
  }

  selectAllIncludingExcluded(entries: FileEntry[]): void {
    for (const entry of entries) {
      this.select(entry.path)
    }
  }

  deselectAll(): void {
    this.selectedFiles.clear()
  }

  // Получение данных
  getSelectedFiles(): string[] {
    return Array.from(this.selectedFiles)
  }

  getSelectedCount(): number {
    return this.selectedFiles.size
  }

  hasSelection(): boolean {
    return this.selectedFiles.size > 0
  }

  // Экспорт/импорт
  exportSelection(): string[] {
    return this.getSelectedFiles()
  }

  importSelection(files: string[]): void {
    this.selectedFiles = new Set(files)
  }

  // Фильтрация
  getFilteredSelection(excludePatterns?: ExcludePatterns): string[] {
    const patterns = excludePatterns || this.excludePatterns
    return this.getSelectedFiles().filter((file) => !patterns.isExcluded(file))
  }

  // Установка паттернов исключений
  setExcludePatterns(patterns: ExcludePatterns): void {
    this.excludePatterns = patterns
  }
}
