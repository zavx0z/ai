#!/usr/bin/env bun
/**
 * Tree Explorer - главный файл запуска
 */

import { parseArgs } from "./src/utils/ArgsParser"
import { TreeExplorer } from "./src/core/TreeExplorer"

async function main() {
  try {
    // Парсинг аргументов командной строки
    const { path, excludePatterns } = parseArgs(process.argv)

    // Создание и запуск приложения
    const explorer = new TreeExplorer(path, excludePatterns)
    await explorer.run()
  } catch (error) {
    console.error("🔥 Фатальная ошибка:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Запуск приложения
main()
