# Правила для CLI

## 1. Приветственное сообщение

```typescript
// Добавлять при старте CLI краткое приветствие с названием приложения
console.log(`🚀 ${APP_NAME} - краткое описание функциональности`)
```

## 2. Структура файла

```typescript cli.ts
// 1. Приветственное сообщение при старте
// 2. Функция help() - всегда с примером использования
// 3. runCLI() - основная логика
// 4. Автозапуск через import.meta.main
```

## 3. Обязательные элементы

```typescript
// Всегда обрабатывай:
if (args.includes('-h')) { help(); return }    // help
if (!file) { ... process.exit(1) }             // валидация
try { ... } catch { process.exit(1) }          // обработка ошибок
```

## 4. Формат help()

```typescript
function help() {
  console.log(`
📋 Использование:
  bun run cli.ts <файл> [опции]

⚙️ Опции:
  -o, --output <путь>  📁 Выходной файл
  -h, --help           ❓ Справка

📝 Примеры:
  bun run cli.ts data.txt
  bun run cli.ts --output result.md
`)
}
```

## 5. Парсинг аргументов

```typescript
// Позиционный аргумент = первый без "-"
const file = args.find(arg => !arg.startsWith('-'))

// Флаги с значениями
const flagIndex = args.findIndex(arg => arg === '-o' || arg === '--output')
const flagValue = flagIndex !== -1 ? args[flagIndex + 1] : undefined
```

## 6. Шаблон для копирования

```typescript
const APP_NAME = 'МоеПриложение'

function help() { /* твоя справка */ }

export async function runCLI() {
  console.log(`🚀 ${APP_NAME} - краткое описание функциональности`)
  
  const args = Bun.argv.slice(2)
  
  if (args.includes('-h')) { help(); return }
  
  const file = args.find(a => !a.startsWith('-'))
  if (!file) { 
    console.error('❌ Укажите файл')
    help()
    process.exit(1)
  }
  
  try {
    console.log('🔄 Обработка...')
    // Твоя логика
    console.log('✅ Готово!')
  } catch (error) {
    console.error('💥 Ошибка:', error)
    process.exit(1)
  }
}

if (import.meta.main) await runCLI()
```

## 7. Правила одним списком

1. **Приветственное сообщение с названием приложения при старте**
2. **Всегда делай `-h/--help`**
3. **Позиционный аргумент = файл (если не указано иначе)**
4. **Валидируй обязательные аргументы**
5. **Используй try/catch с `process.exit(1)` при ошибках**
6. **Примеры в help() обязательны**
7. **`Bun.argv.slice(2)` для аргументов**
8. **`import.meta.main` для автозапуска**
9. **Короткие (`-o`) и длинные (`--output`) флаги**
10. **Вывод должен быть понятен без доп. объяснений**
