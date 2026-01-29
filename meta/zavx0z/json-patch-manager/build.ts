import { watch } from "fs"

// Обработка аргументов командной строки
const args = process.argv.slice(2)
const isWatchMode = args.includes("--watch")

// Функция для очистки кэша модуля
function clearModuleCache(modulePath: string) {
  const absolutePath = require.resolve(modulePath)

  // Удаляем из кэша require.cache (для CommonJS)
  if (require.cache[absolutePath]) {
    delete require.cache[absolutePath]
  }

  // Удаляем из кэша module._cache (для ES модулей в Bun)
  // @ts-ignore - _cache может быть не в типах
  if (typeof Bun !== "undefined" && Bun._cache) {
    // @ts-ignore
    delete Bun._cache[absolutePath]
  }

  // Также удаляем из import.meta.cache если доступно
  // @ts-ignore
  if (import.meta.cache && import.meta.cache.has(absolutePath)) {
    // @ts-ignore
    import.meta.cache.delete(absolutePath)
  }
}

async function build() {
  try {
    const cwd = process.cwd()

    // Чтение package.json с обработкой ошибок
    const packageJsonPath = `${cwd}/package.json`
    if (!(await Bun.file(packageJsonPath).exists())) {
      console.error("Файл package.json не найден")
      return
    }

    const packageJson = await Bun.file(packageJsonPath).text()
    const meta = JSON.parse(packageJson)

    // Безопасное извлечение имени пакета
    const nameParts = meta.name.split("/")
    const name = nameParts.length > 1 ? nameParts[1] : nameParts[0]

    // Очищаем кэш перед импортом, чтобы загрузить свежую версию
    clearModuleCache("./meta.ts")

    // Импорт модуля с добавлением временной метки, чтобы избежать кэширования
    // Добавляем query-параметр чтобы обойти кэш импорта
    const timestamp = Date.now()
    const module = await import(`./meta.ts?t=${timestamp}`)

    // Альтернативный подход: читаем файл напрямую и выполняем
    // const metaContent = await Bun.file("./meta.ts").text()
    // Но это сложно если в файле есть импорты

    const data = module.default

    if (!data) {
      console.error("Default export не найден в meta.ts")
      return
    }

    const json = JSON.stringify(data, null, 2)
    const outputPath = `${name}.json`

    await Bun.write(outputPath, json)

    // Расчет размера файла
    const stat = await Bun.file(outputPath).stat()
    let humanSize: string

    if (stat.size > 1000000) {
      humanSize = `${(stat.size / 1000000).toFixed(2)} Мб`
    } else {
      humanSize = `${(stat.size / 1024).toFixed(2)} Кб`
    }

    console.log(`✓ Собрано ${outputPath} (${humanSize})`)
  } catch (error) {
    console.error("Ошибка сборки:", error)
  }
}

// Первоначальная сборка
build()

// Запуск watcher только если передан --watch
if (isWatchMode) {
  try {
    console.log("👀 Отслеживание изменений в meta.ts...")
    console.log("Нажмите Ctrl+C для остановки")

    const watcher = watch("meta.ts", async (event, filename) => {
      if (filename && event === "change") {
        console.log(`\n🔄 ${filename} изменен, пересборка...`)

        // Даем файловой системе время на запись
        await new Promise((resolve) => setTimeout(resolve, 100))

        build()
      }
    })

    // Обработка ошибок watcher
    watcher.on("error", (error) => {
      console.error("Ошибка watcher:", error)
    })

    // Обработка завершения процесса
    process.on("SIGINT", () => {
      console.log("\n👋 Watcher остановлен")
      process.exit(0)
    })
  } catch (error) {
    console.error("Не удалось запустить watcher:", error)
  }
} else {
  console.log("ℹ️  Режим однократной сборки")
  console.log("Для отслеживания изменений используйте --watch")
}
