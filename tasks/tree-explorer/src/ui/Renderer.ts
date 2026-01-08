import type { FileEntry, RenderOptions } from "../types/types"
import { Theme } from "../utils/Theme"
import { Formatters } from "../utils/Formatters"
import { SelectionManager } from "../core/SelectionManager"

export class Renderer {
  private theme: Theme
  private selectionManager: SelectionManager

  constructor(selectionManager: SelectionManager, theme?: Theme) {
    this.theme = theme || new Theme()
    this.selectionManager = selectionManager
  }

  renderInterface(currentPath: string, entries: FileEntry[], cursorPosition: number, options: RenderOptions): string {
    let output = ""

    // Очистка экрана и перемещение курсора
    output += "\x1b[2J\x1b[H"

    // Шапка
    output += this.renderHeader(currentPath, options)

    // Статус бар
    output += this.renderStatusBar(entries, options)

    // Если в режиме фильтра
    if (options.inFilterMode) {
      output += this.renderFilterInput(options.filterBuffer)
    }

    // Список файлов
    output += this.renderFileList(entries, cursorPosition, options)

    // Подвал с управлением
    output += this.renderFooter(options)

    return output
  }

  private renderHeader(currentPath: string, options: RenderOptions): string {
    return (
      this.theme.headerText("🌳 Tree Explorer") +
      " | " +
      this.theme.yellow +
      currentPath +
      this.theme.reset +
      "\n" +
      this.theme.gray +
      "─".repeat(this.getTerminalWidth()) +
      this.theme.reset +
      "\n"
    )
  }

  private renderStatusBar(entries: FileEntry[], options: RenderOptions): string {
    const status = [
      `Выбрано: ${this.selectionManager.getSelectedCount()}`,
      `Показано: ${entries.length}`,
      options.showHidden ? "Скрытые: вкл" : "Скрытые: выкл",
      options.filter ? `Фильтр: "${options.filter}"` : "",
      options.excludePatterns.length > 0 ? `Исключений: ${options.excludePatterns.length}` : "",
      options.inFilterMode ? "РЕЖИМ ФИЛЬТРА" : "",
    ]
      .filter(Boolean)
      .join(" | ")

    return this.theme.gray + status + this.theme.reset + "\n\n"
  }

  private renderFilterInput(filterBuffer: string): string {
    return this.theme.yellow + "Фильтр: " + this.theme.reset + filterBuffer + "_" + "\n\n"
  }

  private renderFileList(entries: FileEntry[], cursorPosition: number, options: RenderOptions): string {
    if (entries.length === 0) {
      return this.theme.yellow + "Директория пуста" + this.theme.reset + "\n"
    }

    let output = ""
    const visibleHeight = this.getVisibleHeight(options.inFilterMode)
    const startIndex = Math.max(0, cursorPosition - Math.floor(visibleHeight / 2))
    const endIndex = Math.min(entries.length, startIndex + visibleHeight)

    for (let i = startIndex; i < endIndex; i++) {
      const entry = entries[i]
      output += this.renderFileEntry(entry, i === cursorPosition, options)
    }

    // Индикаторы скролла
    if (startIndex > 0) {
      output = this.theme.gray + "↑ Ещё выше...\n" + this.theme.reset + output
    }
    if (endIndex < entries.length) {
      output += this.theme.gray + "↓ Ещё ниже...\n" + this.theme.reset
    }

    return output
  }

  private renderFileEntry(entry: FileEntry, isCursor: boolean, options: RenderOptions): string {
    let line = ""

    // Выделение курсора
    if (isCursor) {
      line += this.theme.bgCursor
    }

    // Маркер выбора
    const isSelected =
      this.selectionManager.isSelected(entry.path) ||
      (entry.isDirectory && this.selectionManager.isSelected(entry.path))

    if (isSelected) {
      line += this.theme.success + "✓ " + this.theme.reset
    } else {
      line += "  "
    }

    // Иконка и имя
    line += this.getFileIcon(entry)
    line += entry.name

    // Дополнительная информация
    line += this.getFileInfo(entry)

    return line + this.theme.reset + "\n"
  }

  private getFileIcon(entry: FileEntry): string {
    if (entry.isDirectory) {
      return this.theme.directory + "📁 " + this.theme.reset
    } else if (entry.isSymlink) {
      if (entry.isBroken) {
        return this.theme.error + "💀 " + this.theme.reset
      } else {
        return this.theme.symlink + "🔗 " + this.theme.reset
      }
    } else {
      return "📄 "
    }
  }

  private getFileInfo(entry: FileEntry): string {
    if (entry.isDirectory) {
      return this.theme.directory + " /" + this.theme.reset
    } else if (entry.isSymlink) {
      return this.theme.gray + ` → ${entry.target}` + this.theme.reset
    } else {
      return this.theme.gray + ` (${Formatters.formatSize(entry.size)})` + this.theme.reset
    }
  }

  private renderFooter(options: RenderOptions): string {
    if (options.inFilterMode) {
      return this.renderFilterFooter()
    } else {
      return this.renderMainFooter()
    }
  }

  private renderMainFooter(): string {
    const footer =
      "\n" +
      this.theme.gray +
      "─".repeat(this.getTerminalWidth()) +
      this.theme.reset +
      "\n" +
      this.theme.yellow +
      "Управление:" +
      this.theme.reset +
      "\n" +
      "  " +
      this.theme.cyan +
      "↑/↓" +
      this.theme.reset +
      " - Навигация  " +
      this.theme.cyan +
      "→/Enter" +
      this.theme.reset +
      " - Войти  " +
      this.theme.cyan +
      "←" +
      this.theme.reset +
      " - Назад  " +
      this.theme.cyan +
      "Пробел" +
      this.theme.reset +
      " - Выбрать директорию (рекурсивно)\n" + // ← добавил "рекурсивно"
      "  " +
      this.theme.cyan +
      "a (ф)" +
      this.theme.reset +
      " - Выбрать всё (рекурсивно)  " + // ← исправил описание
      this.theme.cyan +
      "A (Ф)" +
      this.theme.reset +
      " - Выбрать всё (полностью)\n" +
      "  " +
      this.theme.cyan +
      "d (в)" +
      this.theme.reset +
      " - Снять выбор  " +
      this.theme.cyan +
      "h (р)" +
      this.theme.reset +
      " - Скрытые файлы  " +
      this.theme.cyan +
      "f (а)" +
      this.theme.reset +
      " - Фильтр\n" +
      "  " +
      this.theme.cyan +
      "q (й)/Ctrl+C" +
      this.theme.reset +
      " - Выход  " +
      this.theme.cyan +
      "s (ы)" +
      this.theme.reset +
      " - Показать выбранное\n" +
      "  " +
      this.theme.cyan +
      "e (у)" +
      this.theme.reset +
      " - Режим исключений\n"

    return footer
  }

  private renderFilterFooter(): string {
    return (
      "\n" +
      this.theme.gray +
      "─".repeat(this.getTerminalWidth()) +
      this.theme.reset +
      "\n" +
      this.theme.yellow +
      "Режим фильтра:" +
      this.theme.reset +
      "\n" +
      "  " +
      this.theme.cyan +
      "Enter" +
      this.theme.reset +
      " - Применить  " +
      this.theme.cyan +
      "Esc" +
      this.theme.reset +
      " - Отмена\n"
    )
  }

  private getTerminalWidth(): number {
    return process.stdout.columns || 80
  }

  private getTerminalHeight(): number {
    return process.stdout.rows || 24
  }

  private getVisibleHeight(inFilterMode: boolean): number {
    return this.getTerminalHeight() - (inFilterMode ? 12 : 10)
  }

  // Специальные экраны
  renderSelectedFilesScreen(selectedFiles: string[]): string {
    let output = "\x1b[2J\x1b[H"
    output += this.theme.successText("✅ Выбранные файлы:") + "\n"
    output += this.theme.gray + "─".repeat(this.getTerminalWidth()) + this.theme.reset + "\n\n"

    if (selectedFiles.length === 0) {
      output += this.theme.yellow + "Файлы не выбраны" + this.theme.reset + "\n"
    } else {
      selectedFiles.forEach((file) => {
        // Проверяем расширение или наличие точки в имени как простой признак файла
        const hasExtension = file.includes(".") && !file.endsWith("/")
        const isLikelyFile = hasExtension || !file.includes("/") || file.split("/").pop()?.includes(".")

        if (isLikelyFile) {
          output += `${file}\n`
        }
      })
    }

    output += "\n" + this.theme.gray + "─".repeat(this.getTerminalWidth()) + this.theme.reset + "\n"
    output += this.theme.yellow + "Нажмите любую клавишу для возврата..." + this.theme.reset

    return output
  }

  renderExcludeInfoScreen(patterns: RegExp[]): string {
    let output = "\x1b[2J\x1b[H"
    output += this.theme.magenta + "🚫 Паттерны исключения:" + this.theme.reset + "\n"
    output += this.theme.gray + "─".repeat(this.getTerminalWidth()) + this.theme.reset + "\n\n"

    if (patterns.length === 0) {
      output += this.theme.yellow + "Исключения не заданы" + this.theme.reset + "\n"
    } else {
      patterns.forEach((pattern, index) => {
        output += `${index + 1}. ${pattern.toString()}\n`
      })
    }

    output += "\n" + this.theme.gray + "─".repeat(this.getTerminalWidth()) + this.theme.reset + "\n"
    output += this.theme.yellow + "Нажмите любую клавишу для возврата..." + this.theme.reset

    return output
  }
}
