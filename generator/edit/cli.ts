#!/usr/bin/env bun
import { applySmartPatch } from "./src/smart-patcher"
import type { EditRequest } from "./src/types"

async function main() {
  const args = Bun.argv.slice(2)
  const checkOnly = args.includes("--check") || args.includes("-c")

  // Фильтруем флаги, оставляем только путь к файлу
  const fileArgs = args.filter((a) => !a.startsWith("-"))

  if (fileArgs.length === 0) {
    console.log(`
📝 AI File Editor
Использование: bun run cli.ts <changes.json> [flags]
Флаги:
  --check, -c   Проверка без внесения изменений (Dry Run)
`)
    process.exit(1)
  }

  const rulesPath = fileArgs[0]
  console.log(`🚀 Чтение правил: ${rulesPath}`)

  let rules: EditRequest
  try {
    const text = await Bun.file(rulesPath!).text()
    rules = JSON.parse(text)
  } catch (e) {
    console.error("❌ Ошибка парсинга JSON:", e)
    process.exit(1)
  }

  console.log(`📋 Задача: ${rules.description}`)
  if (checkOnly) console.log("🔍 РЕЖИМ ПРОВЕРКИ (Файлы не будут изменены)")

  for (const op of rules.operations) {
    try {
      const file = Bun.file(op.file)
      const exists = await file.exists()

      // 1. Create
      if (op.action === "create") {
        if (exists) throw new Error("Файл уже существует")
        if (!checkOnly) await Bun.write(op.file, op.replace || "")
        console.log(`✨ Создан: ${op.file}`)
        continue
      }

      // 2. Rename
      if (op.action === "rename") {
        if (!exists) throw new Error("Файл не найден")
        if (!op.newPath) throw new Error("Нет newPath")
        if (!checkOnly) {
          const content = await file.text()
          await Bun.write(op.newPath, content)
          await file.delete()
        }
        console.log(`🚚 Переименован: ${op.file} -> ${op.newPath}`)
        continue
      }

      // 3. Edit / Delete / Overwrite
      if (!exists) throw new Error(`Файл не найден: ${op.file}`)

      const content = await file.text()

      // Применяем патч в памяти
      const newContent = applySmartPatch(content, op)

      if (content !== newContent) {
        if (!checkOnly) await Bun.write(op.file, newContent)

        let icon = "✅"
        if (op.action === "delete") icon = "🗑️"
        if (op.action === "overwrite") icon = "🔥"

        console.log(`${icon} ${op.action === "overwrite" ? "Перезаписан" : "Изменен"}: ${op.file}`)
      } else {
        console.log(`ℹ️ Нет изменений: ${op.file}`)
      }
    } catch (error) {
      console.error(`💥 Ошибка в файле ${op.file}:`)
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  console.log(checkOnly ? "\n🔍 Проверка завершена успешно!" : "\n🎉 Готово!")
}

main()
