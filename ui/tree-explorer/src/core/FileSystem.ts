import { join, dirname } from "path"
import { readdir, lstat, readlink, access, constants } from "fs/promises"
import type { FileEntry } from "../types/types"

export class FileSystem {
  static async readDirectory(path: string): Promise<FileEntry[]> {
    try {
      const files = await readdir(path)
      const entries: FileEntry[] = []

      for (const file of files) {
        const fullPath = join(path, file)
        const entry = await this.getFileEntry(fullPath, file)
        if (entry) {
          entries.push(entry)
        }
      }

      return entries
    } catch (error) {
      throw new Error(`Не удалось прочитать директорию ${path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  static async getFileEntry(fullPath: string, name?: string): Promise<FileEntry | null> {
    try {
      const stats = await lstat(fullPath)
      const isSymlink = stats.isSymbolicLink()

      let target = ""
      let isBroken = false

      if (isSymlink) {
        try {
          target = await readlink(fullPath)
          const targetExists = await access(target, constants.F_OK)
            .then(() => true)
            .catch(() => false)
          isBroken = !targetExists
        } catch {
          isBroken = true
          target = "broken"
        }
      }

      return {
        name: name || this.getFileName(fullPath),
        path: fullPath,
        isDirectory: stats.isDirectory(),
        isSymlink,
        isBroken,
        target,
        size: stats.size,
        mtime: stats.mtime,
        stats,
      }
    } catch {
      return null
    }
  }

  static async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  static async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await lstat(path)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  static async getAllFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = []

    const traverse = async (currentPath: string) => {
      try {
        const entries = await readdir(currentPath)

        for (const entry of entries) {
          const fullPath = join(currentPath, entry)

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

  static getFileName(path: string): string {
    const parts = path.split(/[\\/]/)
    return parts[parts.length - 1] || ""
  }

  static getParentDirectory(path: string): string {
    return dirname(path)
  }

  static join(...paths: string[]): string {
    return join(...paths)
  }
}
