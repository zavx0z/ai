import { dirname } from "node:path"
import type { FileEntry } from "../types/types"

export class ExcludePatterns {
  private patterns: RegExp[] = []

  constructor(patterns: string[] = []) {
    this.patterns = this.parsePatterns(patterns)
  }

  private parsePatterns(patterns: string[]): RegExp[] {
    const parsed: RegExp[] = []

    for (const pattern of patterns) {
      try {
        let regexStr = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\*\*/g, ".*")

        if (!pattern.startsWith("*") && !pattern.startsWith("/")) {
          regexStr = "^" + regexStr
        }

        if (!pattern.endsWith("*") && !pattern.endsWith("/")) {
          regexStr = regexStr + "$"
        }

        parsed.push(new RegExp(regexStr, "i")) // case-insensitive
      } catch (error) {
        console.error(`❌ Некорректный паттерн исключения: ${pattern}`)
      }
    }

    return parsed
  }

  isExcluded(path: string, currentPath?: string): boolean {
    // 1. Check relative path if available
    if (currentPath) {
      const relativePath = this.getRelativePath(path, currentPath)
      for (const pattern of this.patterns) {
        if (pattern.test(relativePath)) return true
      }
    }

    // 2. Check path segments (for recursive exclusions like node_modules)
    let checkPath = path
    while (checkPath && checkPath !== "/" && checkPath !== ".") {
      const name = this.getFileName(checkPath)
      for (const pattern of this.patterns) {
        if (pattern.test(name)) return true
      }
      // Go up
      const parent = dirname(checkPath)
      if (parent === checkPath) break
      checkPath = parent
    }

    return false
  }

  filterEntries(entries: FileEntry[], currentPath: string): FileEntry[] {
    return entries.filter((entry) => !this.isExcluded(entry.path, currentPath))
  }

  getPatterns(): RegExp[] {
    return [...this.patterns]
  }

  addPattern(pattern: string): void {
    const parsed = this.parsePatterns([pattern])
    if (parsed.length > 0) {
      this.patterns.push(...parsed)
    }
  }

  clearPatterns(): void {
    this.patterns = []
  }

  private getFileName(path: string): string {
    const parts = path.split(/[\\/]/)
    return parts[parts.length - 1] || ""
  }

  private getRelativePath(path: string, basePath: string): string {
    if (path.startsWith(basePath)) {
      return path.substring(basePath.length).replace(/^[\\/]/, "")
    }
    return path
  }
}
