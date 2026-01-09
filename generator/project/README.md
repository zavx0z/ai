# File Editor

Утилита для применения изменений к файлам на основе JSON правил.

## Модуль `index.ts`

Основной модуль для работы с правилами редактирования файлов.

### Функции

#### `applyFileChanges(content: string, changes: FileChange[]): string`

Применяет изменения к содержимому файла.

```typescript
import { applyFileChanges } from './src/index'

const changes = [
  { type: 'insert', line: 10, content: '// Новый комментарий' },
  { type: 'replace', line: 15, endLine: 17, content: 'console.log("Обновлено")' }
]

const newContent = applyFileChanges(originalContent, changes)

processEditRules(rules: EditRules, fileContents, applyOperation): Promise<void>
Координирует процесс применения правил редактирования.

Типы
typescript
interface EditRules {
  description: string
  changes: FileOperation[]
}

interface FileOperation {
  file: string        // Абсолютный путь к файлу
  action: 'edit' | 'create' | 'delete' | 'rename'
  changes?: FileChange[]  // Для action: 'edit'
  newPath?: string        // Для action: 'rename'
  newContent?: string     // Для action: 'create'
}

interface FileChange {
  type: 'insert' | 'replace' | 'delete'
  line: number
  endLine?: number
  content?: string
}
Модуль src/validator.ts
Валидация JSON правил перед применением.

typescript
import { validateEditRules } from './src/validator'

try {
  validateEditRules(rules)
  console.log('✅ Правила валидны')
} catch (error) {
  console.error('❌ Ошибка валидации:', error.message)
}
Пример использования
Создание правил редактирования
json
{
  "description": "Добавление новой команды в CLI",
  "changes": [
    {
      "file": "/absolute/path/to/cli.ts",
      "action": "edit",
      "changes": [
        {
          "type": "insert",
          "line": 26,
          "content": "      case \"help\":\n        showHelp()\n        break"
        }
      ]
    }
  ]
}
Запуск через CLI
bash
# Применение изменений
bun run cli.ts rules.json

# Проверка правил без применения
bun run cli.ts rules.json --check

# Подробный вывод
bun run cli.ts rules.json -v
Особенности
✅ Абсолютные пути к файлам

✅ Нумерация строк начинается с 1

✅ Поддержка вставки, замены и удаления

✅ Валидация правил перед применением

✅ Подробные сообщения об ошибках

✅ Возможность проверки без применения

Логика работы
Чтение и валидация правил из JSON файла

Сортировка изменений по позиции для последовательного применения

Автоматический расчет смещения строк при вставке/удалении

Атомарное применение каждой операции с откатом при ошибке

text

## Принцип работы

### 1. Валидация
Перед применением правил происходит строгая валидация всех полей JSON.

### 2. Координация изменений
Основной модуль `src/index.ts` координирует процесс:
- Чтение исходных файлов
- Применение изменений к содержимому
- Запись обновленных файлов

### 3. CLI-интерфейс
Модуль `cli.ts` обеспечивает:
- Чтение JSON правил из файла
- Проверку правил без применения (`--check`)
- Подробный вывод (`--verbose`)
- Обработку ошибок с понятными сообщениями

### 4. Обработка смещения строк
При вставке/удалении строк автоматически пересчитываются позиции последующих изменений.

## Использование

```bash
# Создание файла правил
echo '{
  "description": "Пример изменений",
  "changes": [
    {
      "file": "/absolute/path/to/file.ts",
      "action": "edit",
      "changes": [
        {
          "type": "insert",
          "line": 1,
          "content": "// Автоматически добавлено"
        }
      ]
    }
  ]
}' > rules.json

# Применение изменений
bun run cli.ts rules.json

# Проверка правил
bun run cli.ts rules.json --check
Этот функционал полностью соответствует правилам разработки Bun-проектов:

✅ Использует Bun Native API (Bun.file, Bun.write)

✅ Чистое разделение логики и IO

✅ ГЛАВНЫЙ модуль в src/index.ts

✅ Вся работа с IO в cli.ts

✅ Полная валидация входных данных

✅ Подробные сообщения об ошибках
