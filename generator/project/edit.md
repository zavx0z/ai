# Правило для редактирования файлов проекта

## Формат ответа AI-ассистента

Когда ассистент вносит изменения в проект, он должен возвращать ответ в формате JSON следующей структуры:

```json
{
  "description": "Краткое описание внесенных изменений",
  "changes": [
    {
      "file": "/absolute/path/to/file.ts",
      "action": "edit | create | delete | rename",
      "changes": [
        {
          "type": "replace | insert | delete",
          "line": 10,
          "endLine": 15, // опционально, только для replace
          "content": "новый контент"
        }
      ],
      "newPath": "/absolute/path/to/new-file.ts", // только для rename
      "newContent": "полный контент файла" // только для create
    }
  ]
}
```

## Правила применения изменений

### 1. Редактирование существующего файла (`action: "edit"`)

**Для вставки новых строк:**

```json
{
  "type": "insert",
  "line": 25,
  "content": "новая строка кода"
}
```

*Вставляет контент после указанной строки*

**Для замены блока кода:**

```json
{
  "type": "replace", 
  "line": 10,
  "endLine": 15,
  "content": "новый блок кода"
}
```

*Заменяет строки с 10 по 15 включительно*

**Для удаления строк:**

```json
{
  "type": "delete",
  "line": 20,
  "endLine": 22
}
```

*Удаляет строки с 20 по 22 включительно*

### 2. Создание нового файла (`action: "create"`)

```json
{
  "file": "/absolute/path/to/new-file.ts",
  "action": "create",
  "newContent": "export function helper() {\n  return 'helper';\n}\n"
}
```

### 3. Удаление файла (`action: "delete"`)

```json
{
  "file": "/absolute/path/to/old-file.ts",
  "action": "delete"
}
```

### 4. Переименование файла (`action: "rename"`)

```json
{
  "file": "/absolute/path/to/old-name.ts",
  "action": "rename", 
  "newPath": "/absolute/path/to/new-name.ts"
}
```

## Примеры ответов

### Пример 1: Добавление новой команды в CLI

```json
{
  "description": "Добавлена команда 'help' в CLI",
  "changes": [
    {
      "file": "/Users/zavx0z/ai/actions/comment/cli.ts",
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
```

### Пример 2: Создание нового файла утилит

```json
{
  "description": "Созданы вспомогательные утилиты",
  "changes": [
    {
      "file": "/Users/zavx0z/ai/actions/comment/utils.ts",
      "action": "create",
      "newContent": "export function formatDate(date: Date): string {\n  return date.toISOString();\n}\n\nexport function validateEmail(email: string): boolean {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\n}\n"
    }
  ]
}
```

### Пример 3: Рефакторинг нескольких файлов

```json
{
  "description": "Добавлена новая функция для проверки комментариев",
  "changes": [
    {
      "file": "/Users/zavx0z/ai/actions/comment/index.ts",
      "action": "edit",
      "changes": [
        {
          "type": "insert",
          "line": 300,
          "content": "/**\n * Проверяет, содержит ли код комментарии\n */\nexport function hasComments(sourceCode: string): boolean {\n  const metadata = CommentRemover.collectComments(sourceCode)\n  return metadata.length > 0\n}"
        }
      ]
    },
    {
      "file": "/Users/zavx0z/ai/actions/comment/index.t.ts",
      "action": "edit",
      "changes": [
        {
          "type": "insert",
          "line": 38,
          "content": "/**\n * Опции для проверки комментариев\n */\nexport interface CheckOptions {\n  minLength?: number\n  types?: CommentType[]\n}"
        }
      ]
    }
  ]
}
```

### Пример 4: Исправление бага в CLI

```json
{
  "description": "Исправлена обработка аргументов в функции handleCleanCommand",
  "changes": [
    {
      "file": "/Users/zavx0z/ai/actions/comment/cli.ts",
      "action": "edit",
      "changes": [
        {
          "type": "replace",
          "line": 79,
          "endLine": 83,
          "content": "      default:\n        if (arg && !arg.startsWith(\"--\")) {\n          sourcePath = arg\n        }\n        break"
        }
      ]
    }
  ]
}
```

## Важные замечания

1. **Используются абсолютные пути** к файлам
2. **Нумерация строк начинается с 1**
3. **Для `replace` без `endLine`** заменяется только указанная строка
4. **Для `delete` без `endLine`** удаляется только указанная строка  
5. **Изменения применяются в порядке указания** в массиве `changes`
6. **Опция `oldContent` удалена** - теперь используется только новый контент

## Шаблон ответа для AI-ассистента

```json
{
  "description": "Краткое описание внесенных изменений",
  "changes": [
    // Здесь перечисляются все файлы с изменениями
  ]
}
```
