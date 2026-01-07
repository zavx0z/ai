#!/usr/bin/env bun
/**
 * Tree Explorer - интерактивный CLI для навигации по файловой системе
 * Управление: ↑/↓ - навигация, → - войти в директорию, ← - выйти, пробел - выбор, Enter - подтвердить
 */

import { join, dirname, basename, relative, sep, resolve, isAbsolute } from "path"
import { readdir, stat, lstat, readlink, access, constants } from "fs/promises"
import { existsSync } from "fs"

class TreeExplorer {
  constructor(startPath = process.cwd(), excludePatterns = []) {
    // Проверка платформы
    if (process.platform === "win32") {
      console.error("❌ PTY не поддерживается на Windows")
      process.exit(1)
    }

    // Проверяем, является ли аргумент существующей директорией
    let actualPath = startPath
    try {
      if (existsSync(startPath)) {
        const stats = Bun.file(startPath).exists()
        if (!stats) {
          actualPath = process.cwd()
        }
      }
    } catch (error) {
      actualPath = process.cwd()
    }

    this.currentPath = actualPath
    this.selectedFiles = new Set()
    this.history = [actualPath]
    this.historyIndex = 0
    this.cursorPosition = 0
    this.entries = []
    this.filter = ""
    this.showHidden = false
    this.terminal = null
    this.isRunning = true
    this.inFilterMode = false
    this.filterBuffer = ""
    this.excludePatterns = this.parseExcludePatterns(excludePatterns)
    this.selectAllMode = false

    // ANSI коды для оформления
    this.colors = {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      cyan: "\x1b[36m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      red: "\x1b[31m",
      gray: "\x1b[90m",
      bgSelected: "\x1b[48;5;238m",
      bgCursor: "\x1b[48;5;240m",
    }

    // Соответствие русских символов английским для горячих клавиш
    this.russianToEnglish = {
      ф: "a",
      и: "b",
      с: "c",
      в: "d",
      у: "e",
      а: "f",
      п: "g",
      р: "h",
      ш: "i",
      щ: "j",
      к: "k",
      ы: "l",
      м: "m",
      т: "n",
      ь: "o",
      б: "p",
      ю: "q",
      я: "r",
      д: "s",
      з: "t",
      й: "u",
      ц: "v",
      ж: "w",
      х: "x",
      ч: "y",
      э: "z",
      н: "y",
      г: "u",
      е: "t",
      о: "j",
    }

    this.setupSignalHandlers()
  }

  parseExcludePatterns(patterns) {
    const parsed = []
    for (const pattern of patterns) {
      try {
        let regexStr = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\*\*/g, ".*")

        if (!pattern.startsWith("*") && !pattern.startsWith("/")) {
          regexStr = "^" + regexStr
        }

        if (!pattern.endsWith("*") && !pattern.endsWith("/")) {
          regexStr = regexStr + "$"
        }

        parsed.push(new RegExp(regexStr))
      } catch (error) {
        console.error(this.colors.red + `❌ Некорректный паттерн исключения: ${pattern}` + this.colors.reset)
      }
    }
    return parsed
  }

  isExcluded(path) {
    const relativePath = relative(this.currentPath, path)
    const fileName = basename(path)

    for (const pattern of this.excludePatterns) {
      if (pattern.test(fileName) || pattern.test(relativePath) || pattern.test(path)) {
        return true
      }
    }
    return false
  }

  async run() {
    try {
      console.log(this.colors.cyan + "🌳 Tree Explorer запущен..." + this.colors.reset)
      console.log(this.colors.gray + "Нажмите Ctrl+C для выхода" + this.colors.reset)

      if (this.excludePatterns.length > 0) {
        console.log(this.colors.yellow + `Исключения: ${this.excludePatterns.length} паттернов` + this.colors.reset)
      }

      this.terminal = new Bun.Terminal({
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data: (term, data) => {
          process.stdout.write(data)
        },
      })

      this.setupInput()
      this.setupResize()

      await this.loadEntries()
      this.render()

      await this.mainLoop()
    } catch (error) {
      console.error(this.colors.red + "🔥 Ошибка:" + error.message + this.colors.reset)
      this.cleanup()
      process.exit(1)
    }
  }

  async mainLoop() {
    while (this.isRunning) {
      await Bun.sleep(50)
    }
  }

  async loadEntries() {
    try {
      const stats = await lstat(this.currentPath).catch(() => null)

      if (!stats || !stats.isDirectory()) {
        const parentPath = dirname(this.currentPath)
        if (parentPath !== this.currentPath) {
          this.currentPath = parentPath
          this.history = [this.currentPath]
          this.historyIndex = 0
          return this.loadEntries()
        } else {
          this.currentPath = process.env.HOME || "/"
          this.history = [this.currentPath]
          this.historyIndex = 0
          return this.loadEntries()
        }
      }

      const files = await readdir(this.currentPath)
      this.entries = []

      for (const file of files) {
        if (!this.showHidden && file.startsWith(".")) {
          continue
        }

        if (this.filter && !file.toLowerCase().includes(this.filter.toLowerCase())) {
          continue
        }

        const fullPath = join(this.currentPath, file)

        if (this.isExcluded(fullPath)) {
          continue
        }

        const stats = await lstat(fullPath).catch(() => null)

        if (!stats) {
          continue
        }

        const isSymlink = stats.isSymbolicLink()
        let target = ""
        let isBroken = false

        if (isSymlink) {
          try {
            target = await readlink(fullPath)
            const targetExists = await access(target, constants.F_OK)
              .then(() => true)
              .catch(() => false)
            if (!targetExists) {
              isBroken = true
            }
          } catch {
            isBroken = true
            target = "broken"
          }
        }

        this.entries.push({
          name: file,
          path: fullPath,
          isDirectory: stats.isDirectory(),
          isSymlink,
          isBroken,
          target,
          size: stats.size,
          mtime: stats.mtime,
          stats,
        })
      }

      this.entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      if (this.cursorPosition >= this.entries.length) {
        this.cursorPosition = Math.max(0, this.entries.length - 1)
      }
    } catch (error) {
      this.entries = []

      if (error.code === "EACCES" || error.code === "EPERM") {
        console.error(this.colors.red + `❌ Нет доступа к директории: ${this.currentPath}` + this.colors.reset)

        const homeDir = process.env.HOME || "/"
        if (homeDir !== this.currentPath) {
          this.currentPath = homeDir
          this.history = [this.currentPath]
          this.historyIndex = 0
          return this.loadEntries()
        }
      } else if (error.code === "ENOENT") {
        console.error(this.colors.red + `❌ Директория не существует: ${this.currentPath}` + this.colors.reset)

        const homeDir = process.env.HOME || "/"
        if (homeDir !== this.currentPath) {
          this.currentPath = homeDir
          this.history = [this.currentPath]
          this.historyIndex = 0
          return this.loadEntries()
        }
      } else {
        console.error(this.colors.red + `❌ Ошибка чтения директории: ${error.message}` + this.colors.reset)
      }
    }
  }

  // Проверяем выбрана ли директория (сама или все файлы внутри)
  isDirectorySelected(dirPath) {
    // 1. Проверяем выбрана ли сама директория
    if (this.selectedFiles.has(dirPath)) {
      return true
    }

    // 2. Получаем все файлы внутри директории (без исключений)
    try {
      const allFiles = this.getAllFilesInDirectorySync(dirPath)
      if (allFiles.length === 0) {
        return false // Директория пуста
      }

      // 3. Проверяем выбраны ли все файлы внутри
      let allSelected = true
      for (const file of allFiles) {
        if (!this.selectedFiles.has(file)) {
          allSelected = false
          break
        }
      }

      return allSelected
    } catch {
      return false
    }
  }

  getAllFilesInDirectorySync(dirPath) {
    const files = []

    const traverse = (currentPath) => {
      try {
        const entries = Bun.readdirSync(currentPath)

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name)

          // Проверяем исключения
          if (this.isExcluded(fullPath)) {
            continue
          }

          // Пропускаем скрытые файлы если они отключены
          if (!this.showHidden && entry.name.startsWith(".")) {
            continue
          }

          // Проверяем фильтр
          if (this.filter && !entry.name.toLowerCase().includes(this.filter.toLowerCase())) {
            continue
          }

          files.push(fullPath)

          if (entry.isDirectory()) {
            traverse(fullPath)
          }
        }
      } catch {
        // Пропускаем директории без доступа
      }
    }

    traverse(dirPath)
    return files
  }

  render() {
    let output = "\x1b[2J\x1b[H"

    output +=
      this.colors.bold +
      this.colors.cyan +
      "🌳 Tree Explorer" +
      this.colors.reset +
      " | " +
      this.colors.yellow +
      this.currentPath +
      this.colors.reset +
      "\n"

    output += this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n"

    const status = [
      `Выбрано: ${this.selectedFiles.size}`,
      `Показано: ${this.entries.length}`,
      this.showHidden ? "Скрытые: вкл" : "Скрытые: выкл",
      this.filter ? `Фильтр: "${this.filter}"` : "",
      this.excludePatterns.length > 0 ? `Исключений: ${this.excludePatterns.length}` : "",
      this.inFilterMode ? "РЕЖИМ ФИЛЬТРА" : "",
    ]
      .filter(Boolean)
      .join(" | ")

    output += this.colors.gray + status + this.colors.reset + "\n\n"

    if (this.inFilterMode) {
      output += this.colors.yellow + "Фильтр: " + this.colors.reset + this.filterBuffer + "_" + "\n\n"
    }

    if (this.entries.length === 0) {
      output += this.colors.yellow + "Директория пуста" + this.colors.reset + "\n"
    } else {
      const visibleHeight = (process.stdout.rows || 24) - (this.inFilterMode ? 12 : 10)
      const startIndex = Math.max(0, this.cursorPosition - Math.floor(visibleHeight / 2))
      const endIndex = Math.min(this.entries.length, startIndex + visibleHeight)

      for (let i = startIndex; i < endIndex; i++) {
        const entry = this.entries[i]
        let line = ""

        if (i === this.cursorPosition) {
          line += this.colors.bgCursor
        }

        const isSelected =
          this.selectedFiles.has(entry.path) || (entry.isDirectory && this.isDirectorySelected(entry.path))

        if (isSelected) {
          line += this.colors.green + "✓ " + this.colors.reset
        } else {
          line += "  "
        }

        if (entry.isDirectory) {
          line += this.colors.blue + "📁 " + this.colors.reset
        } else if (entry.isSymlink) {
          if (entry.isBroken) {
            line += this.colors.red + "💀 " + this.colors.reset
          } else {
            line += this.colors.cyan + "🔗 " + this.colors.reset
          }
        } else {
          line += "📄 "
        }

        line += entry.name

        if (entry.isDirectory) {
          // Показываем количество файлов внутри (примерно)
          try {
            const filesInDir = this.getAllFilesInDirectorySync(entry.path)
            line += this.colors.blue + ` (${filesInDir.length}) /` + this.colors.reset
          } catch {
            line += this.colors.blue + " /" + this.colors.reset
          }
        } else if (entry.isSymlink) {
          line += this.colors.gray + ` → ${entry.target}` + this.colors.reset
        } else {
          line += this.colors.gray + ` (${this.formatSize(entry.size)})` + this.colors.reset
        }

        output += line + this.colors.reset + "\n"
      }

      if (startIndex > 0) {
        output = this.colors.gray + "↑ Ещё выше...\n" + this.colors.reset + output
      }
      if (endIndex < this.entries.length) {
        output += this.colors.gray + "↓ Ещё ниже...\n" + this.colors.reset
      }
    }

    if (!this.inFilterMode) {
      output += "\n" + this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n"
      output += this.colors.yellow + "Управление:" + this.colors.reset + "\n"
      output += "  " + this.colors.cyan + "↑/↓" + this.colors.reset + " - Навигация  "
      output += this.colors.cyan + "→/Enter" + this.colors.reset + " - Войти  "
      output += this.colors.cyan + "←" + this.colors.reset + " - Назад  "
      output += this.colors.cyan + "Пробел" + this.colors.reset + " - Выбрать/снять директорию\n"
      output += "  " + this.colors.cyan + "a (ф)" + this.colors.reset + " - Выбрать всё (без исключений)  "
      output += this.colors.cyan + "A (Ф)" + this.colors.reset + " - Выбрать всё (полностью)\n"
      output += "  " + this.colors.cyan + "d (в)" + this.colors.reset + " - Снять выбор  "
      output += this.colors.cyan + "h (р)" + this.colors.reset + " - Скрытые файлы  "
      output += this.colors.cyan + "f (а)" + this.colors.reset + " - Фильтр\n"
      output += "  " + this.colors.cyan + "q (й)/Ctrl+C" + this.colors.reset + " - Выход  "
      output += this.colors.cyan + "s (ы)" + this.colors.reset + " - Показать выбранное\n"
      output += "  " + this.colors.cyan + "e (у)" + this.colors.reset + " - Режим исключений\n"
    } else {
      output += "\n" + this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n"
      output += this.colors.yellow + "Режим фильтра:" + this.colors.reset + "\n"
      output += "  " + this.colors.cyan + "Enter" + this.colors.reset + " - Применить  "
      output += this.colors.cyan + "Esc" + this.colors.reset + " - Отмена\n"
    }

    process.stdout.write(output)
  }

  formatSize(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  setupInput() {
    process.stdin.setRawMode(true)
    process.stdin.setEncoding("utf8")
    process.stdin.resume()

    process.stdin.on("data", (key) => {
      this.handleKeyPress(key.toString())
    })
  }

  convertRussianKey(key) {
    if (key.length === 1) {
      const lowerKey = key.toLowerCase()
      return this.russianToEnglish[lowerKey] || lowerKey
    }
    return key
  }

  handleKeyPress(key) {
    if (this.inFilterMode) {
      this.handleFilterMode(key)
      return
    }

    const normalizedKey = this.convertRussianKey(key)

    if (key === "\u0003" || normalizedKey === "q" || normalizedKey === "й") {
      this.exitGracefully()
      return
    }

    if (key === "\u001b[A") {
      this.moveCursor(-1)
    } else if (key === "\u001b[B") {
      this.moveCursor(1)
    } else if (key === "\u001b[C" || key === "\r") {
      this.enterDirectory()
    } else if (key === "\u001b[D") {
      this.goBack()
    } else if (key === " ") {
      this.toggleSelection()
    } else if (normalizedKey === "a" || normalizedKey === "ф") {
      this.selectAllExcluding()
    } else if (normalizedKey === "A" || key === "Ф" || (key === "ф" && key === key.toUpperCase())) {
      this.selectAllCompletely()
    } else if (normalizedKey === "d" || normalizedKey === "в") {
      this.deselectAll()
    } else if (normalizedKey === "h" || normalizedKey === "р") {
      this.toggleHidden()
    } else if (normalizedKey === "f" || normalizedKey === "а") {
      this.startFilter()
    } else if (normalizedKey === "s" || normalizedKey === "ы") {
      this.showSelected()
    } else if (normalizedKey === "e" || normalizedKey === "у") {
      this.showExcludeInfo()
    }
  }

  handleFilterMode(key) {
    if (key === "\r") {
      this.filter = this.filterBuffer
      this.filterBuffer = ""
      this.inFilterMode = false
      this.reloadAndRender()
    } else if (key === "\u001b") {
      this.filterBuffer = ""
      this.inFilterMode = false
      this.reloadAndRender()
    } else if (key === "\x7f") {
      if (this.filterBuffer.length > 0) {
        this.filterBuffer = this.filterBuffer.slice(0, -1)
        this.render()
      }
    } else if (key.length === 1 && key.match(/[a-zA-Z0-9 _\-\.а-яА-Я]/)) {
      this.filterBuffer += key
      this.render()
    }
  }

  moveCursor(delta) {
    const newPos = this.cursorPosition + delta
    if (newPos >= 0 && newPos < this.entries.length) {
      this.cursorPosition = newPos
      this.render()
    }
  }

  async enterDirectory() {
    if (this.entries.length === 0) return

    const entry = this.entries[this.cursorPosition]
    if (entry.isDirectory) {
      try {
        await access(entry.path, constants.R_OK)

        this.history = this.history.slice(0, this.historyIndex + 1)
        this.history.push(entry.path)
        this.historyIndex++
        this.currentPath = entry.path
        this.cursorPosition = 0
        await this.loadEntries()
        this.render()
      } catch (error) {
        process.stdout.write(this.colors.red + `\n❌ Нет доступа к директории: ${entry.name}` + this.colors.reset)
      }
    } else if (entry.isSymlink && !entry.isBroken) {
      try {
        const targetStats = await lstat(entry.target)
        if (targetStats.isDirectory()) {
          this.history = this.history.slice(0, this.historyIndex + 1)
          this.history.push(entry.path)
          this.historyIndex++
          this.currentPath = entry.target
          this.cursorPosition = 0
          await this.loadEntries()
          this.render()
        }
      } catch (error) {
        process.stdout.write(this.colors.red + `\n❌ Не удалось перейти по ссылке: ${entry.name}` + this.colors.reset)
      }
    }
  }

  async goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this.currentPath = this.history[this.historyIndex]
      this.cursorPosition = 0
      await this.loadEntries()
      this.render()
    }
  }

  async toggleSelection() {
    if (this.entries.length === 0) return

    const entry = this.entries[this.cursorPosition]
    if (entry.isDirectory) {
      await this.toggleDirectorySelection(entry.path)
    } else {
      if (this.selectedFiles.has(entry.path)) {
        this.selectedFiles.delete(entry.path)
      } else {
        this.selectedFiles.add(entry.path)
      }
    }
    this.render()
  }

  async toggleDirectorySelection(dirPath) {
    try {
      // Получаем все файлы внутри директории
      const allFiles = await this.getAllFilesInDirectoryAsync(dirPath)

      if (allFiles.length === 0) {
        // Если директория пуста - просто добавляем/удаляем саму директорию
        if (this.selectedFiles.has(dirPath)) {
          this.selectedFiles.delete(dirPath)
        } else {
          this.selectedFiles.add(dirPath)
        }
        return
      }

      // Проверяем, все ли файлы внутри уже выбраны
      let allSelected = true
      for (const file of allFiles) {
        if (!this.selectedFiles.has(file)) {
          allSelected = false
          break
        }
      }

      // Если сама директория выбрана, считаем что все выбрано
      if (this.selectedFiles.has(dirPath)) {
        allSelected = true
      }

      if (allSelected) {
        // Снимаем выбор: удаляем директорию и все файлы внутри
        this.selectedFiles.delete(dirPath)
        for (const file of allFiles) {
          this.selectedFiles.delete(file)
        }
      } else {
        // Добавляем выбор: добавляем директорию и все файлы внутри
        this.selectedFiles.add(dirPath)
        for (const file of allFiles) {
          this.selectedFiles.add(file)
        }
      }
    } catch (error) {
      console.error(this.colors.red + `❌ Ошибка при выборе директории: ${error.message}` + this.colors.reset)
    }
  }

  async getAllFilesInDirectoryAsync(dirPath) {
    const files = []

    const traverse = async (currentPath) => {
      try {
        const entries = await readdir(currentPath)

        for (const entryName of entries) {
          const fullPath = join(currentPath, entryName)

          // Проверяем исключения
          if (this.isExcluded(fullPath)) {
            continue
          }

          // Пропускаем скрытые файлы если они отключены
          if (!this.showHidden && entryName.startsWith(".")) {
            continue
          }

          // Проверяем фильтр
          if (this.filter && !entryName.toLowerCase().includes(this.filter.toLowerCase())) {
            continue
          }

          try {
            const stats = await lstat(fullPath)
            files.push(fullPath)

            if (stats.isDirectory() && !stats.isSymbolicLink()) {
              await traverse(fullPath)
            }
          } catch {
            continue
          }
        }
      } catch (error) {
        return
      }
    }

    await traverse(dirPath)
    return files
  }

  async deselectDirectory(dirPath) {
    this.selectedFiles.delete(dirPath)

    const filesToRemove = []
    for (const filePath of this.selectedFiles) {
      if (filePath.startsWith(dirPath + sep)) {
        filesToRemove.push(filePath)
      }
    }

    for (const filePath of filesToRemove) {
      this.selectedFiles.delete(filePath)
    }
  }

  async selectAllExcluding() {
    console.log(this.colors.cyan + "Выбираю все файлы (с учетом исключений)..." + this.colors.reset)

    // Выбираем все видимые файлы в текущей директории
    for (const entry of this.entries) {
      if (!this.isExcluded(entry.path)) {
        this.selectedFiles.add(entry.path)
      }
    }
    this.render()
  }

  async selectAllCompletely() {
    console.log(this.colors.cyan + "Выбираю все файлы (полностью)..." + this.colors.reset)

    // Выбираем все видимые файлы в текущей директории
    for (const entry of this.entries) {
      this.selectedFiles.add(entry.path)
    }
    this.render()
  }

  deselectAll() {
    this.selectedFiles.clear()
    this.render()
  }

  async toggleHidden() {
    this.showHidden = !this.showHidden
    await this.loadEntries()
    this.render()
  }

  startFilter() {
    this.inFilterMode = true
    this.filterBuffer = this.filter
    this.render()
  }

  async showSelected() {
    process.stdout.write("\x1b[2J\x1b[H")

    let output = this.colors.bold + this.colors.green + "✅ Выбранные файлы:" + this.colors.reset + "\n"
    output += this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n\n"

    if (this.selectedFiles.size === 0) {
      output += this.colors.yellow + "Файлы не выбраны" + this.colors.reset + "\n"
    } else {
      let index = 1

      // Группируем файлы по директориям
      const dirGroups = new Map()
      const singleFiles = []

      for (const path of this.selectedFiles) {
        const dirName = dirname(path)
        const fileName = basename(path)

        // Проверяем является ли сам путь директорией
        try {
          const stats = await lstat(path)
          if (stats.isDirectory()) {
            if (!dirGroups.has(path)) {
              dirGroups.set(path, [])
            }
            dirGroups.get(path).push({ name: fileName, isDir: true })
          } else {
            if (!dirGroups.has(dirName)) {
              dirGroups.set(dirName, [])
            }
            dirGroups.get(dirName).push({ name: fileName, isDir: false })
          }
        } catch {
          singleFiles.push(path)
        }
      }

      // Выводим директории с файлами
      for (const [dirPath, files] of dirGroups) {
        const relativeDirPath = relative(process.cwd(), dirPath)
        output += this.colors.blue + `📁 ${relativeDirPath}/` + this.colors.reset + "\n"

        for (const file of files) {
          const icon = file.isDir ? "📁 " : "📄 "
          output += `    ${icon}${file.name}\n`
        }
        output += "\n"
      }

      // Выводим одиночные файлы
      if (singleFiles.length > 0) {
        output += this.colors.yellow + "Отдельные файлы:" + this.colors.reset + "\n"
        for (const path of singleFiles) {
          const relativePath = relative(process.cwd(), path)
          output += `  📄 ${relativePath}\n`
        }
      }

      output += "\n" + this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n"
      output +=
        this.colors.green + `Всего выбрано: ${this.selectedFiles.size} файлов/директорий` + this.colors.reset + "\n"
      output += this.colors.yellow + "Нажмите любую клавишу для возврата..." + this.colors.reset
    }

    process.stdout.write(output)

    const returnHandler = () => {
      process.stdin.removeAllListeners("data")
      process.stdin.on("data", (key) => {
        this.handleKeyPress(key.toString())
      })
      this.render()
    }

    process.stdin.removeAllListeners("data")
    process.stdin.on("data", returnHandler)
  }

  async showExcludeInfo() {
    process.stdout.write("\x1b[2J\x1b[H")

    let output = this.colors.bold + this.colors.magenta + "🚫 Паттерны исключения:" + this.colors.reset + "\n"
    output += this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n\n"

    if (this.excludePatterns.length === 0) {
      output += this.colors.yellow + "Исключения не заданы" + this.colors.reset + "\n"
    } else {
      let index = 1
      for (const pattern of this.excludePatterns) {
        output += `${index}. ${pattern.toString()}\n`
        index++
      }

      output += "\n" + this.colors.gray + "Примеры паттернов:" + this.colors.reset + "\n"
      output += "  *.log         - все файлы с расширением .log\n"
      output += "  node_modules  - директория node_modules\n"
      output += "  temp*         - файлы и директории начинающиеся с temp\n"
      output += "  *test*        - файлы содержащие test в имени\n"
    }

    output += "\n" + this.colors.gray + "─".repeat(process.stdout.columns || 80) + this.colors.reset + "\n"
    output += this.colors.yellow + "Нажмите любую клавишу для возврата..." + this.colors.reset

    process.stdout.write(output)

    const returnHandler = () => {
      process.stdin.removeAllListeners("data")
      process.stdin.on("data", (key) => {
        this.handleKeyPress(key.toString())
      })
      this.render()
    }

    process.stdin.removeAllListeners("data")
    process.stdin.on("data", returnHandler)
  }

  async reloadAndRender() {
    await this.loadEntries()
    this.render()
  }

  setupResize() {
    process.stdout.on("resize", () => {
      if (this.terminal) {
        this.terminal.resize(process.stdout.columns, process.stdout.rows)
      }
      this.render()
    })
  }

  setupSignalHandlers() {
    ;["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
      process.on(signal, () => {
        console.log("\n" + this.colors.cyan + `Получен сигнал ${signal}, завершаю работу...` + this.colors.reset)
        this.exitGracefully()
      })
    })
  }

  exitGracefully() {
    this.isRunning = false

    console.log("\n" + this.colors.cyan + "👋 Выход из Tree Explorer" + this.colors.reset)

    if (this.selectedFiles.size > 0) {
      console.log(this.colors.green + `\nВыбрано файлов: ${this.selectedFiles.size}` + this.colors.reset)
      console.log(this.colors.gray + "Список выбранных файлов:" + this.colors.reset)
      for (const path of this.selectedFiles) {
        const relativePath = relative(process.cwd(), path)
        const excluded = this.isExcluded(path) ? " [ИСКЛЮЧЕНО]" : ""
        console.log(`  ${relativePath}${excluded}`)
      }
    }

    this.cleanup()
    process.exit(0)
  }

  cleanup() {
    if (this.terminal) {
      this.terminal.close()
    }
    process.stdin.setRawMode(false)
    process.stdin.removeAllListeners("data")
  }
}

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2)
  let startPath = process.cwd()
  const excludePatterns = []
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === "--exclude" || arg === "-e") {
      i++
      if (i < args.length) {
        excludePatterns.push(args[i])
      }
    } else if (arg.startsWith("--exclude=")) {
      excludePatterns.push(arg.substring(10))
    } else if (arg.startsWith("-e=")) {
      excludePatterns.push(arg.substring(3))
    } else if (arg === "--help" || arg === "-h") {
      console.log("🌳 Tree Explorer - интерактивный файловый менеджер\n")
      console.log("Использование:")
      console.log("  bun index.ts [путь] [опции]\n")
      console.log("Опции:")
      console.log("  --exclude, -e PATTERN  Исключить файлы по паттерну (можно указать несколько)")
      console.log("  --help, -h             Показать эту справку\n")
      console.log("Примеры:")
      console.log("  bun index.ts /path/to/dir")
      console.log('  bun index.ts -e "*.log" -e "node_modules"')
      console.log('  bun index.ts --exclude="temp*" --exclude="*.tmp"')
      process.exit(0)
    } else if (!arg.startsWith("-")) {
      startPath = arg
    }

    i++
  }

  return { startPath, excludePatterns }
}

// Главная функция
async function main() {
  let { startPath, excludePatterns } = parseArgs()

  if (existsSync(startPath)) {
    try {
      const stats = await lstat(startPath).catch(() => null)
      if (stats && !stats.isDirectory()) {
        console.log(`⚠️  "${startPath}" не является директорией. Использую текущую директорию.`)
        startPath = process.cwd()
      }
    } catch (error) {
      console.log(`⚠️  Не удалось проверить путь "${startPath}". Использую текущую директорию.`)
      startPath = process.cwd()
    }
  } else {
    console.log(`⚠️  Путь "${startPath}" не существует. Использую текущую директорию.`)
    startPath = process.cwd()
  }

  const explorer = new TreeExplorer(startPath, excludePatterns)

  try {
    await explorer.run()
  } catch (error) {
    console.error("🔥 Ошибка:", error.message)
    process.exit(1)
  }
}

// Запуск программы
main()
