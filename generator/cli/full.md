# Правила для разработки пакета с CLI

## 📁 Структура проекта

```
project/
├── src/          # Модули с ЧИСТОЙ бизнес-логикой (без IO)
│   ├── parser.ts      # Парсинг
│   ├── formatter.ts   # Форматирование
│   ├── validator.ts   # Валидация
│   └── types.ts       # Типы TypeScript
├── index.ts      # ГЛАВНЫЙ модуль - точка входа для логики
├── cli.ts        # ЕДИНСТВЕННЫЙ CLI-модуль (вся работа с IO)
├── README.md     # описание функционала
└── package.json
```

## 🎯 Принцип разделения ответственности

### ❌ ЗАПРЕЩЕНО в модулях `src/`

- `Bun.file()`, `Bun.write()`, `fs.readFile()` (любой IO)
- `console.log()`, `process.stdout.write()`
- `process.exit()`, `process.exitCode`
- Зависимости от аргументов командной строки
- Работа с файловыми путями как с файлами

### ✅ ОБЯЗАТЕЛЬНО в `index.ts` (в корне)

- Главная функция, которая координирует процесс
- Импорт и использование других модулей из `src/`
- Принимает данные (строки, объекты, массивы)
- Возвращает готовый результат (строку или объект)
- Никакого прямого IO, только вызов функций из модулей `src/`

### ✅ ОБЯЗАТЕЛЬНО в `cli.ts`

- Парсинг аргументов командной строки
- Чтение файлов с диска
- Запись файлов на диск
- Вывод в консоль
- Обработка ошибок с `process.exit(1)`
- Вызов главной функции из `index.ts`

## 📝 шаблон `cli.ts`

```typescript
const APP_NAME = 'МоеПриложение'

function help() {
  console.log(`
📋 Использование:
  my-cli <файл> [опции]

⚙️ Опции:
  -o, --output <путь>  📁 Сохранить результат в файл
  -v, --verbose        🔍 Подробный вывод
  -h, --help           ❓ Справка

📝 Примеры:
  my-cli input.txt
  my-cli input.txt --output output.md
  my-cli input.txt -v
`)
}

async function readInput(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      throw new Error(`Файл не найден: ${filePath}`)
    }
    return await file.text()
  } catch (error) {
    throw new Error(`Ошибка чтения файла: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function saveOutput(filePath: string, content: string): Promise<void> {
  try {
    await Bun.write(filePath, content)
  } catch (error) {
    throw new Error(`Ошибка записи файла: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function runCLI() {
  console.log(`🚀 ${APP_NAME} - краткое описание функциональности`)
  
  const args = Bun.argv.slice(2)
  
  // Help
  if (args.includes('-h') || args.includes('--help')) {
    help()
    return
  }
  
  // Входной файл (первый позиционный аргумент)
  const inputIndex = args.findIndex(arg => !arg.startsWith('-'))
  const inputFile = inputIndex !== -1 ? args[inputIndex] : null
  
  if (!inputFile) {
    console.error('❌ Укажите входной файл')
    help()
    process.exit(1)
  }
  
  // Флаги вывода
  const outputIndex = args.findIndex(arg => 
    arg === '-o' || arg === '--output'
  )
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null
  
  // Другие флаги
  const verbose = args.includes('-v') || args.includes('--verbose')
  
  try {
    console.log(`📖 Чтение файла: ${inputFile}`)
    
    // 1. Чтение ввода (ТОЛЬКО в CLI)
    const inputContent = await readInput(inputFile)
    
    // 2. Обработка через ГЛАВНЫЙ модуль index.ts (из корня)
    console.log('🔄 Обработка...')
    const { mainProcess } = await import('./index')
    const result = mainProcess(inputContent, { verbose })
    
    // 3. Вывод результата (ТОЛЬКО в CLI)
    if (outputFile) {
      await saveOutput(outputFile, result)
      console.log(`✅ Результат сохранён: ${outputFile}`)
    } else {
      console.log('\n' + '='.repeat(40))
      console.log(result)
      console.log('='.repeat(40) + '\n')
    }
    
    console.log('🎉 Готово!')
    
  } catch (error) {
    console.error('💥 Ошибка:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

if (import.meta.main) {
  await runCLI()
}
```

## 📦 Пример `index.ts`

```typescript
import { parseData } from './src/parser'
import { formatResult } from './src/formatter'
import { validateInput } from './src/validator'
import type { ProcessingOptions } from './src/types'

export function mainProcess(input: string, options: ProcessingOptions = {}): string {
  // 1. Валидация входных данных
  validateInput(input)
  
  // 2. Парсинг (если нужно)
  const parsedData = parseData(input)
  
  // 3. Основная бизнес-логика (может быть сложной)
  const processedData = processLogic(parsedData, options)
  
  // 4. Форматирование результата
  const formattedResult = formatResult(processedData, options)
  
  return formattedResult
}

function processLogic(data: any, options: ProcessingOptions): any {
  // Основная логика обработки
  // Может быть разбита на вспомогательные функции
  // ВСЕГДА возвращает данные, не выводит их
  
  if (options.verbose) {
    // Добавляем метаданные, но не выводим в консоль
    return {
      ...data,
      metadata: { processedAt: new Date().toISOString(), verbose: true }
    }
  }
  
  return data
}
```

## 📋 Критические правила для ассистента

1. **ГЛАВНЫЙ модуль - `index.ts` в корне** - точка входа для всей бизнес-логики
2. **`index.ts` координирует процесс** - вызывает парсер, валидатор, форматтер из `src/`
3. **ВСЯ бизнес-логика в `src/`** - чистые функции, возвращающие данные
4. **ВСЯ работа с IO в `cli.ts`** - чтение/запись файлов, консоль
5. **CLI вызывается без `bun run`** - пользователь устанавливает пакет и использует `my-cli`
6. **README.md ТОЛЬКО про функционал** - без CLI флагов, только API модулей
7. **Описание ВСЕХ модулей в README** - их назначение и использование
8. **Примеры использования API** - как импортировать и вызывать функции
9. **Приветственное сообщение** - при запуске CLI
10. **Обязательный `-h/--help`** - с примерами использования (без `bun run`)
11. **Валидация аргументов** - с понятными ошибками
12. **Обработка ошибок** - `try/catch` с `process.exit(1)`
13. **Позиционные аргументы** - первый без `-` это входной файл
14. **Функции возвращают строки** - сохранение в файл делает CLI
15. **Используй `Bun.argv.slice(2)`** - для получения аргументов
16. **`import.meta.main`** - для автозапуска CLI
