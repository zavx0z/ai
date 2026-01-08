# AI Context Project

Утилита создания контекста проекта для AI-ассистентов, код-ревью или создания обзорной документации.

## Особенности

- 📁 **Структура проекта** — автоматически генерирует дерево файлов
- 📝 **Нумерация строк** — добавляет нумерацию для удобства обсуждения кода
- 🎯 **Гибкие настройки** — контроль над нумерацией для разных типов файлов
- 🔍 **Проверка файлов** — сообщает о недостающих файлах
- 📊 **Подсветка синтаксиса** — автоматически определяет язык для блоков кода
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

### Без нумерации строк

```bash
bun cli.ts files.txt --no-numbers
```

### Кастомные исключения нумерации

```bash
bun cli.ts files.txt --exclude-numbers .txt,.json,.env
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
| `--no-numbers` | | Отключить нумерацию строк |
| `--exclude-numbers <расширения>` | | Расширения файлов без нумерации (через запятую) |
| `--help` | `-h` | Показать справку |
| `--version` | `-v` | Показать версию |

## Формат файла со списком

Создайте текстовый файл со списком файлов для обработки:

```txt
# Пример файла files.txt
# Пути могут быть абсолютными или относительными
# Пустые строки и строки, начинающиеся с #, игнорируются

/path/to/project/src/main.ts
/path/to/project/src/utils.ts
/path/to/project/package.json
/path/to/project/README.md
```

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
    1 | export function main() {
    2 |   console.log("Hello, world!");
    3 | }
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
  outputFile: 'output.md',
  addLineNumbers: true,
  excludeLineNumbers: ['.md', '.json']
})
```

### Функции модулей

- **`readFileList(filePath)`** — читает список файлов из текстового файла
- **`checkFilesExist(files)`** — проверяет существование файлов
- **`getCommonRoot(files)`** — находит общий корневой путь
- **`addLineNumbersToContent(content)`** — добавляет нумерацию строк
- **`createFileTree(files)`** — строит дерево файлов в виде строки

## Настройка по умолчанию

```typescript
const DEFAULT_CONFIG = {
  OUTPUT_FILE: "./tmp/output.md",
  ADD_LINE_NUMBERS: true,
  EXCLUDE_LINE_NUMBERS: [".md", ".mdx", ".txt", ".json", ".yaml", ".yml", ".env", ".gitignore"],
}
```
