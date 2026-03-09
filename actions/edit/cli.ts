#!/usr/bin/env bun
import { applyPatch, applySmartPatch } from "./src/smart-patcher"
import { detectFormat } from "./src/format-detector"
import type { EditRequest, FileOperation } from "./src/types"

async function main() {
  const args = Bun.argv.slice(2)
  const checkOnly = args.includes("--check") || args.includes("-c")

  // Фильтруем флаги, оставляем только путь к файлу
  const fileArgs = args.filter((a) => !a.startsWith("-"))

  if (fileArgs.length === 0) {
    console.log(`
📝 AI File Editor (Multi-Format)
Использование: bun run cli.ts <patch-file> [flags]

Поддерживаемые форматы:
  • Unified Diff (--- a/file.ts)
  • FILE: формат (FILE: path/to/file.ts)
  • JSON Patch ([{"op": "replace", "path": "/foo"}])
  • AI Edit ([{"op": "replace", "path": "file.md", "value": "..."}])

Флаги:
  --check, -c   Проверка без внесения изменений (Dry Run)
`)
    process.exit(1)
  }

  const patchPath = fileArgs[0]
  console.log(`🚀 Чтение патча: ${patchPath}`)

  let patchContent: string
  try {
    patchContent = await Bun.file(patchPath!).text()
  } catch (e) {
    console.error("❌ Ошибка чтения файла:", e)
    process.exit(1)
  }

  // Определяем формат
  let format: string
  try {
    format = detectFormat(patchContent)
    console.log(`📋 Формат: ${format}`)
  } catch (e) {
    console.error("❌ Ошибка определения формата:", e)
    process.exit(1)
  }

  if (checkOnly) console.log("🔍 РЕЖИМ ПРОВЕРКИ (Файлы не будут изменены)")

  const modified: string[] = []
  const created: string[] = []
  const failed: Array<{ file: string; error: string }> = []

  try {
    // Применяем патч
    const { results, errors } = await applyPatch(
      patchContent,
      async (path: string) => {
        const file = Bun.file(path)
        const exists = await file.exists()
        if (!exists) {
          throw new Error(`Файл не найден: ${path}`)
        }
        return await file.text()
      },
      async (path: string, content: string) => {
        if (!checkOnly) {
          await Bun.write(path, content)
        }
      }
    )

    // Выводим результаты
    for (const result of results) {
      if (!checkOnly) {
        await Bun.write(result.file, result.newContent)
      }
      
      if (result.created) {
        created.push(result.file)
        console.log(`✨ Создан: ${result.file}`)
      } else {
        modified.push(result.file)
        console.log(`✅ Изменен: ${result.file}`)
      }
    }

    for (const error of errors) {
      failed.push(error)
      console.error(`💥 Ошибка в файле ${error.file}:`)
      console.error(`   ${error.error}`)
    }
  } catch (e) {
    console.error("❌ Критическая ошибка:", e)
    process.exit(1)
  }

  // Итоговый отчёт
  console.log("\n" + "=".repeat(50))
  console.log(`📊 Итоги:`)
  console.log(`   Создано файлов: ${created.length}`)
  console.log(`   Изменено файлов: ${modified.length}`)
  console.log(`   Ошибок: ${failed.length}`)
  
  if (failed.length > 0) {
    console.log("\n⚠️ Не удалось применить:")
    for (const f of failed) {
      console.log(`   • ${f.file}: ${f.error}`)
    }
    process.exit(1)
  }

  console.log(checkOnly ? "\n🔍 Проверка завершена успешно!" : "\n🎉 Готово!")
}

main()
