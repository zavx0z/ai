import rules from "./commit.md" with {type: "text"}

const APP_NAME = "Commit Context Generator"

function help() {
  console.log(`
📋 Использование:
  bun run cli.ts <патч-файл> [опции]

⚙️ Опции:
  -c, --code <файл>    📄 Файл с исходным кодом до изменений (необязательный)
  -o, --output <путь>  📁 Выходной файл (по умолчанию: ./tmp/output.md)
  -h, --help           ❓ Справка

📝 Примеры:
  bun run cli.ts diff.patch
  bun run cli.ts diff.patch --code before.ts
  bun run cli.ts diff.patch -o ./tmp/output.md
`)
}

export async function runCLI() {
  console.log(`🚀 ${APP_NAME} - создание контекста для AI-агента`)

  const args = Bun.argv.slice(2)

  // Помощь
  if (args.includes("-h") || args.includes("--help")) {
    help()
    return
  }

  // Позиционный аргумент - файл с патчем (обязательный)
  const patchFile = args.find((arg) => !arg.startsWith("-"))
  if (!patchFile) {
    console.error("❌ Укажите файл с патчем (diff/staged изменения)")
    help()
    process.exit(1)
  }

  // Парсинг флагов
  let outputPath = "./tmp/output.md"
  let codeFile: string | undefined = undefined

  // Парсим флаг --output
  const outputFlagIndex = args.findIndex((arg) => arg === "-o" || arg === "--output")
  if (outputFlagIndex !== -1 && args[outputFlagIndex + 1]) {
    outputPath = args[outputFlagIndex + 1] as string
  }

  // Парсим флаг --code
  const codeFlagIndex = args.findIndex((arg) => arg === "-c" || arg === "--code")
  if (codeFlagIndex !== -1 && args[codeFlagIndex + 1]) {
    codeFile = args[codeFlagIndex + 1]
  }

  try {
    console.log(`📖 Чтение файлов...`)
    // Читаем патч
    let patchContent: string
    try {
      patchContent = await Bun.file(patchFile).text()
      console.log(`✅ Прочитан патч из ${patchFile}`)
    } catch (error) {
      console.error(`❌ Не удалось прочитать патч ${patchFile}:`, (error as Error).message)
      process.exit(1)
    }

    // Читаем код, если передан
    let codeContent: string = ""
    if (codeFile) {
      try {
        codeContent = await Bun.file(codeFile).text()
        console.log(`✅ Прочитан код из ${codeFile}`)
      } catch (error) {
        console.error(`❌ Не удалось прочитать код ${codeFile}:`, (error as Error).message)
        process.exit(1)
      }
    }

    // Создаем директорию для выходного файла
    const outputDir = outputPath.split("/").slice(0, -1).join("/")
    if (outputDir) {
      await Bun.$`mkdir -p ${outputDir}`.quiet().catch(() => {})
    }

    // 4. Записываем в выходной файл: правила → код → патч
    let outputContent = rules + "\n"
    if (codeContent) outputContent += codeContent + "\n"
    outputContent += patchContent

    try {
      await Bun.write(outputPath, outputContent)
      console.log(`✅ Контекст создан: ${outputPath}`)
    } catch (error) {
      console.error(`❌ Не удалось записать файл ${outputPath}:`, (error as Error).message)
      process.exit(1)
    }
  } catch (error) {
    console.error("💥 Неожиданная ошибка:", error)
    process.exit(1)
  }
}

if (import.meta.main) {
  await runCLI()
}
