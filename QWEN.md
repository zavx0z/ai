# AI Tools Project — Контекст для AI-ассистентов

## 📋 Обзор проекта

**AI Tools** — это набор инструментов для AI-ассистентов (ChatGPT, Claude, Gemini и других) для улучшения работы с кодом и проектами. Проект предоставляет утилиты для:

- Точной навигации по коду с нумерацией строк
- Сбора всей документации проекта в один файл
- Работы с комментариями (удаление/восстановление через AST)
- Исправления TypeScript ошибок
- Интерактивной навигации по файловой системе

### Основные технологии

| Технология | Назначение |
|------------|------------|
| **Bun** | Runtime для максимальной производительности |
| **TypeScript** | Основной язык разработки |
| **@metafor/** | Семейство внутренних библиотек (atom, inspect, meta, space) |
| **Workspaces** | Модульная архитектура через bun workspaces |

---

## 🏗️ Архитектура проекта

```
ai/
├── actions/           # Инструменты для конкретных действий
│   ├── arbitr/        # Арбитраж (TBD)
│   ├── comment/       # Работа с комментариями (AST)
│   ├── commit/        # Генерация коммитов
│   ├── edit/          # Редактирование кода
│   ├── join/          # Сбор контекста проекта
│   ├── lint/          # Линтинг и исправление ошибок
│   └── tree/          # Работа с деревом файлов
│
├── generator/         # Генераторы и CLI
│   ├── bun/           # Bun-генераторы
│   ├── cli/           # Интерактивный файловый менеджер
│   ├── code/          # Генерация кода
│   ├── doc/           # Генерация документации
│   └── terminal/      # PTY документация
│
├── ui/                # UI компоненты
│   ├── tree-explorer/ # Исследователь дерева файлов
│   ├── tui/           # Terminal UI
│   └── tui-base/      # Базовые TUI компоненты
│
├── tools/             # Утилиты
│   ├── git/           # Git-инструменты
│   ├── keyboard/      # Работа с клавиатурой
│   ├── vision/        # Vision-инструменты
│   └── window/        # Управление окнами
│
├── web/               # Веб-компоненты
│   └── chat/          # AI чат-интерфейс
│
├── meta/              # Мета-данные и конфигурации
│   └── zavx0z/        # Конфигурации zavx0z
│
├── server.ts          # HTTP сервер для веб-интерфейса
├── index.html         # Главная HTML страница
└── package.json       # Конфигурация проекта
```

---

## 🚀 Building и Running

### Установка зависимостей

```bash
bun install
```

### Основные команды

| Команда | Описание |
|---------|----------|
| `bun run dev` | Запуск сервера в режиме hot-reload (порт 9999) |
| `bun run ai` | Запуск основного AI-интерфейса |
| `bun run files` | Генерация дерева файлов в `tmp/files.json` |
| `bun run join` | Сбор файлов проекта в `tmp/join.md` |
| `bun run lint` | Запуск линтера с генерацией отчёта |
| `bun run edit-context` | Подготовка контекста для редактирования |
| `bun run commit` | Генерация сообщения коммита |
| `bun run upd` | Очистка и перелинковка зависимостей |
| `bun run clear` | Удаление `node_modules` |

### Работа с отдельными инструментами

```bash
# Сбор документации проекта
bun run actions/project/collect-files.ts

# Нумерация строк в файле
bun run actions/lines/cli.ts src/index.ts

# Удаление комментариев из файла
bun run actions/comment/cli.ts clean src/index.ts

# Запуск интерактивного файлового менеджера
bun run generator/cli/index.ts .
```

---

## 📁 Workspaces

Проект использует Bun workspaces для модульности:

```json
{
  "workspaces": [
    "./actions/*",
    "./tasks/*",
    "./generator/*",
    "./ui/*",
    "./tools/*",
    "./web/*",
    "./meta/**"
  ]
}
```

### Пакеты

| Пакет | Путь | Описание |
|-------|------|----------|
| `comment` | `actions/comment` | Работа с комментариями |
| `commit` | `actions/commit` | Генерация коммитов |
| `edit` | `actions/edit` | Редактирование кода |
| `join` | `actions/join` | Сбор контекста |
| `fix` | `actions/lint` | Линтинг |
| `tree` | `actions/tree` | Дерево файлов |
| `cli` | `generator/cli` | CLI инструменты |
| `code` | `generator/code` | Генерация кода |
| `tui` | `ui/tui` | Terminal UI |
| `ai-chat` | `web/chat` | Веб-чат |
| `ai-keyboard` | `tools/keyboard` | Утилиты клавиатуры |
| `ai-window` | `tools/window` | Управление окнами |
| `ai-vision` | `tools/vision` | Vision утилиты |

---

## 🔧 Конфигурация

### TypeScript (`tsconfig.json`)

- **Target**: ESNext
- **Module**: Preserve (для bundler)
- **Module Resolution**: bundler
- **Strict Mode**: включён
- **JSX**: react-jsx
- **No Emit**: true (проверка типов без компиляции)

### Bun (`package.json`)

- **Type**: module (ESM)
- **Bin**: `ui/tui/ai.ts` (доступен как `ai`)

### Исключения (`zavx0z.yaml`)

```yaml
exclude:
  - node_modules
  - dist
  - .git
  - .vscode
  - tmp
  - bun.lock
  - .DS_Store
  - *.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico
```

---

## 📖 Использование с AI-ассистентами

### Для ChatGPT/Claude/Gemini

1. **Соберите документацию проекта**:

   ```bash
   bun run actions/project/collect-files.ts
   # Создаст ai-documentation.md со всем кодом и нумерацией строк
   ```

2. **Передайте файл ассистенту**:
   - Загрузите `ai-documentation.md` в контекст
   - Ассистент сможет точно указывать номера строк при анализе

3. **Работа с комментариями**:
   - Удалите комментарии для упрощения анализа
   - Восстановите их после внесения изменений

### Примеры команд для AI-контекста

```bash
# Собрать всю документацию проекта
bun run actions/project/collect-files.ts

# Пронумеровать строки в файле
bun run actions/lines/cli.ts src/index.ts

# Удалить комментарии из файла
bun run actions/comment/cli.ts clean src/index.ts

# Запустить интерактивный файловый менеджер
bun run generator/cli/index.ts .
```

---

## 🎯 Ключевые инструменты

### actions/join

Утилита создания контекста проекта для AI-ассистентов:

- Генерирует дерево файлов
- Автоматическая подсветка синтаксиса
- Проверка существования файлов
- Поддержка JSON и текстовых форматов списка файлов

### actions/comment

Работа с комментариями через AST:

- Удаление комментариев для анализа чистого кода
- Восстановление комментариев после изменений
- Поддержка TypeScript/JavaScript
- Сохранение метаданных

### generator/cli

Интерактивный файловый менеджер:

- PTY-поддержка для терминала
- Навигация по проектам
- Фильтрация по имени и типам файлов

---

## 🌐 Веб-сервер

Сервер запускается на порту **9999**:

```typescript
// server.ts
serve({
  port: 9999,
  routes: {
    "/": index,
    "/metafor.js": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js"),
    // ...
  },
})
```

Использует `BroadcastChannel` для коммуникации между компонентами.

---

## 📝 Development Conventions

### Стиль кода

- **TypeScript** с strict mode
- **ESM** модули
- **Bundler** module resolution
- Минимальные комментарии в коде (код должен быть самодокументируемым)

### Структура пакетов

Каждый workspace-пакет имеет:

- `package.json` с именем и зависимостями
- `tsconfig.json` для TypeScript
- `README.md` с документацией
- `index.ts` или `cli.ts` как точка входа

### Тестирование

Некоторые пакеты содержат тесты в файлах `index.t.ts`.

---

## 🔗 Полезные ссылки

- [Bun документация](https://bun.sh/docs)
- [TypeScript документация](https://www.typescriptlang.org/docs/)
- [Правила для правил](rule-rule.md) — универсальные правила без привязки к коду

---

## 📄 Лицензия

MIT License — свободное использование, изменение и распространение.
