import { Theme } from "./theme"
import { Keys, withRawMode } from "./keyboard"
import { KeyMapper } from "tui-base"
import { readdir, stat } from "fs/promises"
import { join, relative } from "path"

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export async function filePicker(
  title: string,
  startPath: string = process.cwd(),
  extensions?: string[]
): Promise<string | null> {
  let currentPath = startPath
  let idx = 0
  let files: FileEntry[] = []

  const loadFiles = async () => {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true })
      files = entries
        .map((e) => ({
          name: e.name,
          path: join(currentPath, e.name),
          isDirectory: e.isDirectory(),
          isFile: e.isFile(),
        }))
        .sort((a, b) => {
          // Сначала директории, потом файлы
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })

      // Добавляем ".." если не в корне
      if (currentPath !== "/" && currentPath !== process.cwd()) {
        files.unshift({
          name: "..",
          path: join(currentPath, ".."),
          isDirectory: true,
          isFile: false,
        })
      }

      // Фильтруем по расширениям если указаны
      if (extensions) {
        files = files.filter((f) => {
          if (f.isDirectory) return true
          return extensions.some((ext) => f.name.endsWith(ext))
        })
      }
    } catch {
      files = []
    }
  }

  await loadFiles()

  const render = () => {
    Theme.clearScreen()
    Theme.printTitle(title)
    console.log(`${Theme.gray}Путь: ${currentPath}${Theme.reset}\n`)

    files.forEach((file, i) => {
      const icon = file.isDirectory ? "📁" : "📄"
      const prefix = i === idx ? `${Theme.selected}${Theme.cyan}` : Theme.unselected
      const suffix = Theme.reset
      console.log(`${prefix}${icon} ${file.name}${suffix}`)
    })

    console.log(`\n${Theme.gray}[↑↓] Навигация [Enter] Выбрать [h] Домой [Esc] Назад${Theme.reset}`)
  }

  return withRawMode(() => new Promise<string | null>((resolve) => {
    render()

    const handler = async (key: string) => {
      if (key === Keys.CTRL_C) process.exit(0)

      if (key === "q" || key === "й") {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      if (key === "h") {
        currentPath = process.cwd()
        idx = 0
        await loadFiles()
        render()
        return
      }

      if (KeyMapper.isBack(key)) {
        process.stdin.off("data", handler)
        Theme.clearScreen()
        resolve(null)
        return
      }

      if (KeyMapper.isUp(key)) {
        idx = (idx - 1 + files.length) % files.length
        render()
      } else if (KeyMapper.isDown(key)) {
        idx = (idx + 1) % files.length
        render()
      } else if (KeyMapper.isEnter(key) || key === " ") {
        const selected = files[idx]
        if (!selected) return

        if (selected.isDirectory) {
          if (selected.name === "..") {
            currentPath = join(currentPath, "..")
          } else {
            currentPath = selected.path
          }
          idx = 0
          await loadFiles()
          render()
        } else if (selected.isFile) {
          process.stdin.off("data", handler)
          Theme.clearScreen()
          resolve(selected.path)
        }
      }
    }

    process.stdin.on("data", handler)
  }))
}
