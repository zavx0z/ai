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
  
  // Создаем структурированный объект для сохранения
  const data = {
    generated: new Date().toISOString(),
    totalFiles: allFiles.length,
    directory: path,
    files: allFiles.map(file => ({
      path: file,
      name: file.split(/[\\/]/).pop() || file,
      isDirectory: file.endsWith("/") || (!file.includes(".") && !file.includes("/"))
    }))
  }
  
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
  
  // Сохраняем в файл
  await Bun.write(filePath, JSON.stringify(data, null, 2))
  console.log(`✅ Сохранено ${allFiles.length} файлов в: ${filePath}`)
  
  return allFiles
}

async function main() {
  try {
    // Загрузка конфигурации
    const config = await loadConfig()
    
    // Парсинг аргументов командной строки
    const { path, excludePatterns, selectAll, outputFile, exitAfterSave } = parseArgs(process.argv)

    // Неинтерактивный режим: выбор всех файлов и сохранение
    if (selectAll) {
      const selectedFiles = await selectAllAndSave(path, excludePatterns, outputFile || config.outputFile)
      
      if (exitAfterSave) {
        console.log("🚪 Выход после сохранения (--exit)")
        process.exit(0)
      } else {
        console.log("\nℹ️  Для выхода используйте Ctrl+C или 'q'")
        console.log("ℹ️  Для запуска в интерактивном режиме запустите без параметра --all")
        
        // Ожидаем нажатия любой клавиши для выхода
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.on("data", (key) => {
          if (key.toString() === "\u0003" || key.toString().toLowerCase() === "q") {
            console.log("\n👋 Выход из программы...")
            process.exit(0)
          }
        })
      }
      return
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
