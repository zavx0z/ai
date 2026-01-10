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

async function selectAllAndSave(path: string, excludePatterns: string[], outputFile?: string): Promise<string[]> {
  console.log("🔍 Начинаем рекурсивный выбор файлов...")
  
  const FileSystem = await import("./src/core/FileSystem").then(m => m.FileSystem)
  const ExcludePatterns = await import("./src/utils/ExcludePatterns").then(m => m.ExcludePatterns)
  
  const exclude = new ExcludePatterns(excludePatterns)
  const allFiles: string[] = []
  
  async function traverse(currentPath: string) {
    try {
      const entries = await FileSystem.readDirectory(currentPath)
      
      for (const entry of entries) {
        if (exclude.isExcluded(entry.path)) {
          continue
        }
        
        allFiles.push(entry.path)
        
        if (entry.isDirectory) {
          await traverse(entry.path)
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка при сканировании ${currentPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  await traverse(path)
  
  // Преобразуем все пути к абсолютным
  const { resolve } = await import("path")
  const absoluteFiles = allFiles.map(file => resolve(file))
  
  // Формируем простой массив абсолютных путей без статистики и имен файлов
  const data = absoluteFiles
  
  // Определяем путь для сохранения
  let filePath: string
  
  if (outputFile) {
    filePath = outputFile
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const filename = `selected-files-${timestamp}.json`
    const { join } = await import("path")
    filePath = join(path, filename)
  }
  
  // Сохраняем в файл - простой массив абсолютных путей
  await Bun.write(filePath, JSON.stringify(data, null, 2))
  console.log(`✅ Сохранено ${data.length} абсолютных путей в: ${filePath}`)
  
  return absoluteFiles
}

async function main() {
  try {
    // Загрузка конфигурации
    const config = await loadConfig()
    
    // Парсинг аргументов командной строки
    const { path, excludePatterns, pipelineMode, outputFile } = parseArgs(process.argv)

    // Режим пайплайна: выбрать всё, сохранить и выйти
    if (pipelineMode) {
      console.log("🚀 Запуск в режиме пайплайна...")
      console.log("📁 Директория:", path)
      if (excludePatterns.length > 0) {
        console.log("🚫 Исключения:", excludePatterns)
      }
      if (outputFile || config.outputFile) {
        console.log("💾 Сохранение в:", outputFile || config.outputFile)
      }
      
      const selectedFiles = await selectAllAndSave(path, excludePatterns, outputFile || config.outputFile)
      console.log("✅ Пайплайн завершен. Выход.")
      process.exit(0)
    }
    
    // Интерактивный режим
    const explorer = new TreeExplorer(path, excludePatterns, config)
    await explorer.run()
  } catch (error) {
    console.error("🔥 Фатальная ошибка:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Запуск приложения
main()
