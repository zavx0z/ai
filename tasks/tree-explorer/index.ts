#!/usr/bin/env bun
/**
 * Tree Explorer - главный файл запуска
 */

import { parseArgs } from "./src/utils/ArgsParser"
import { TreeExplorer } from "./src/core/TreeExplorer"
import type { AppConfig } from "./src/types/types"

async function loadConfig(): Promise<AppConfig> {
  try {
    // Пробуем загрузить конфигурацию из файла config.yaml в текущей директории
    const configFile = Bun.file("config.yaml")
    
    if (await configFile.exists()) {
      const configText = await configFile.text()
      const config = Bun.YAML.parse(configText) as AppConfig
      console.log("📁 Конфигурация загружена из config.yaml")
      if (config.outputFile) {
        console.log(`📂 Файл сохранения: ${config.outputFile}`)
      }
      return config
    } else {
      console.log("ℹ️  Файл config.yaml не найден, используются настройки по умолчанию")
      return {}
    }
  } catch (error) {
    console.error("⚠️  Ошибка загрузки конфигурации:", error instanceof Error ? error.message : String(error))
    console.log("ℹ️  Используются настройки по умолчанию")
    return {}
  }
}

async function main() {
  try {
    // Загрузка конфигурации
    const config = await loadConfig()
    
    // Парсинг аргументов командной строки
    const { path, excludePatterns } = parseArgs(process.argv)

    // Создание и запуск приложения
    const explorer = new TreeExplorer(path, excludePatterns, config)
    await explorer.run()
  } catch (error) {
    console.error("🔥 Фатальная ошибка:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Запуск приложения
main()
