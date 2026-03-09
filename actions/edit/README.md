# AI File Editor

Утилита для надежного редактирования файлов с помощью ИИ с поддержкой нескольких форматов патчей.

## Особенности

- **Unified Diff** — стандартный формат diff для AI-инструментов
- **FILE: Формат** — простой формат для перезаписи файлов и search/replace
- **JSON Patch** — RFC 6902 для JSON файлов
- **AI Edit** — массив операций `{op, path, value}` для редактирования файлов
- **Fuzzy Match** — умный поиск игнорирует различия в пробелах и отступах
- **Safety First** — сухой прогон (`--check`) и строгая валидация

## Использование

```bash
# Применение изменений
bun run cli.ts patch-file

# Тестовый прогон (без записи на диск)
bun run cli.ts patch-file --check
```

## Поддерживаемые форматы

### 1. Unified Diff (основной)

Стандартный формат diff с заголовками `--- a/file` и `+++ b/file`:

```diff
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,5 +1,6 @@
 import { foo } from "./foo"
 
-const old = 1
+const newValue = 42
+const extra = "added"
 
 export { newValue }
```

**Поведение:**

| Характеристика | Описание |
| -------------- | -------- |
| Путь к файлу | Автоматическое определение из заголовков |
| Применение | Diff алгоритм с fuzzy matching |
| Ошибки | При невозможности чистого применения |

### 2. Whole File Rewrite

Полная перезапись файла:

```
FILE: path/to/file.ts

<полное содержимое файла>
```

**Поведение:**

| Характеристика | Описание |
| -------------- | -------- |
| Существующий файл | Перезаписывает содержимое |
| Новый файл | Создаёт файл |

### 3. Search / Replace Blocks

Замена блоков кода:

```
FILE: path/to/file.ts

SEARCH
old code block

REPLACE
new code block
```

**Поведение:**

| Характеристика | Описание |
| -------------- | -------- |
| Поиск | Нормализованный matching (игнорирует пробелы) |
| Замена | Только найденный раздел |
| Fuzzy matching | Встроенная логика для нечёткого поиска |

### 4. JSON Patch (RFC 6902)

Массив операций с `op` и `path` (JSON Pointer):

```json
[
  { "op": "replace", "path": "/version", "value": "2.0.0" },
  { "op": "add", "path": "/newField", "value": "data" }
]
```

**Поведение:**

| Характеристика | Описание |
| -------------- | -------- |
| Тип файлов | Только JSON |
| Спецификация | RFC 6902 |
| Операции | `add`, `remove`, `replace`, `move`, `copy`, `test` |

### 5. AI Edit Operations

Массив операций для редактирования файлов:

```json
[
  {
    "op": "replace",
    "path": "AGENT.md",
    "value": "# New content"
  },
  {
    "op": "add",
    "path": "rules/new-rule.md",
    "value": "# New Rule\n\nContent"
  }
]
```

**Поведение:**

| Характеристика | Описание |
| -------------- | -------- |
| Операции | `replace` (изменение), `add` (создание) |
| Путь | Относительный путь к файлу |
| Значение | Полное содержимое файла |

## Определение формата

Формат определяется автоматически по началу файла:

| Начало файла | Формат |
| ------------ | ------ |
| `--- a/` | Unified Diff |
| `FILE:` | FILE: формат |
| `[` + `path` начинается с `/` | JSON Patch (RFC 6902) |
| `[` + `path` не начинается с `/` | AI Edit Operations |

## Вывод

CLI выводит:

| Статус | Описание |
| ------ | -------- |
| `✨ Создан` | Новый файл создан |
| `✅ Изменен` | Файл изменён |
| `💥 Ошибка` | Не удалось применить патч |

## Примеры

### Пример 1: Unified Diff

```bash
bun run cli.ts changes.diff
```

### Пример 2: FILE: формат

```bash
bun run cli.ts edits.txt
```

### Пример 3: Dry Run

```bash
bun run cli.ts changes.diff --check
```

## Интеграция с TUI

TUI использует edit через задачу `edit`:

```bash
# В TUI выберите "🔨 Редактирование" → "📋 Из буфера"
# Или используйте файл .ai/edit.json
```

## API

### applyPatch

Основная функция для применения патчей:

```typescript
import { applyPatch } from "edit"

const result = await applyPatch(
  patchContent,
  async (path) => await Bun.file(path).text(),
  async (path, content) => await Bun.write(path, content)
)

console.log(result.results) // Успешные применения
console.log(result.errors)  // Ошибки
```

### applySmartPatch

Fuzzy matching для search/replace:

```typescript
import { applySmartPatch } from "edit"

const newContent = applySmartPatch(oldContent, {
  file: "example.ts",
  action: "replace",
  search: "old code",
  replace: "new code"
})
```
