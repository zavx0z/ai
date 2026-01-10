# AI Context Project

Утилита создания контекста проекта для AI-ассистентов, код-ревью или создания обзорной документации.

## Особенности

- 📁 **Структура проекта** — автоматически генерирует дерево файлов
- 📊 **Подсветка синтаксиса** — автоматически определяет язык для блоков кода
- 🔍 **Проверка файлов** — сообщает о недостающих файлах
- 🚀 **Быстрая работа** — построена на Bun для максимальной производительности

## Использование

### Базовое использование

```bash
bun cli.ts files.txt
```

### С указанием выходного файла

```bash
bun cli.ts files.txt --output docs/project.md
```

### Полный синтаксис

```bash
bun cli.ts <путь-к-файлу> [опции]
```

## Параметры командной строки

| Параметр | Короткая версия | Описание |
|----------|----------------|----------|
| `--file <путь>` | `-f` | Путь к файлу со списком файлов |
| `--output <путь>` | `-o` | Путь к выходному файлу (по умолчанию: `ai-documentation.md`) |
| `--help` | `-h` | Показать справку |
| `--version` | `-v` | Показать версию |

## Формат файла со списком



### 2. JSON формат (новый)

Создайте JSON файл с расширенными возможностями:

```json
[
  {
    "path": "/path/to/project/src/main.ts"
  },
  {
    "path": "/path/to/project/src/utils.ts",
    "skip": true  // Файл будет пропущен
  },
  {
    "path": "/path/to/project/config.yaml",
    "content": "apiKey: 123\nenv: prod"  // Прямое указание содержимого
  },
  "/path/to/project/README.md"  // Простая строка тоже работает
]
```

**Преимущества JSON формата:**

- Пропуск файлов через флаг `skip`
- Прямое указание содержимого в поле `content`
- Более структурированный формат

## Пример выходного файла

Утилита генерирует Markdown файл со следующей структурой:

```markdown
# Проект

├── src/
│   ├── main.ts
│   └── utils.ts
├── package.json
└── README.md

    ```typescript /path/to/project/src/main.ts
    export function main() {
      console.log("Hello, world!");
    }
    ```

...и так далее для каждого файла.

```

## Поддерживаемые языки для подсветки синтаксиса

Инструмент автоматически определяет язык по расширению файла:

- **TypeScript**: `.ts`, `.tsx`
- **JavaScript**: `.js`, `.jsx`
- **WGSL**: `.wgsl`
- **HTML/CSS**: `.html`, `.css`
- **Markdown**: `.md`, `.mdx`
- **Конфигурационные файлы**: `.json`, `.yaml`, `.yml`, `.env`, `.gitignore`

## API

### Основная функция

```typescript
import { createDocumentationFromFileList } from './index'

await createDocumentationFromFileList({
  fileListPath: 'files.txt',
  outputFile: 'output.md'
})
```

### Функции модулей

- **`readFileList(filePath)`** — читает список файлов из текстового файла
- **`checkFilesExist(files)`** — проверяет существование файлов
- **`getCommonRoot(files)`** — находит общий корневой путь
- **`createFileTree(files)`** — строит дерево файлов в виде строки

```
