import type { LinterOptions } from "./types"
import path from "path"
import fs from "fs"

export function validateOptions(options: LinterOptions): void {
  if (options.tsconfigPath) {
    // Проверяем существует ли файл
    if (!fs.existsSync(options.tsconfigPath)) {
      throw new Error(`Файл tsconfig не найден: ${options.tsconfigPath}`)
    }

    // Проверяем расширение
    if (!options.tsconfigPath.endsWith("tsconfig.json")) {
      console.warn(`⚠️ Путь к tsconfig должен заканчиваться на tsconfig.json: ${options.tsconfigPath}`)
    }
  }

  if (options.strict && options.tsconfigPath) {
    console.warn("⚠️ Режим strict может конфликтовать с настройками tsconfig")
  }
}

export function validateFilePath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return [".ts", ".tsx", ".mts", ".cts"].includes(ext)
}
