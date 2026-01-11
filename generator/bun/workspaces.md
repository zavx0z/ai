# 📦 Правила работы с Bun Workspaces

## 1. Управление зависимостями (Local Packages)

При добавлении зависимости на другой локальный пакет внутри монорепозитория:

* **⛔️ ЗАПРЕЩЕНО:** Использовать относительные пути (`file:../pkg`), `npm link` или абсолютные пути.
* **✅ ОБЯЗАТЕЛЬНО:** Использовать протокол `workspace:`.

### Формат в package.json

Всегда используй версию `*` для внутренних пакетов, чтобы гарантировать использование актуальной версии кода из соседней директории.

**Неправильно:**

```json
"dependencies": {
  "my-shared-lib": "file:../shared-lib",
  "utils": "1.0.0"
}
```

**Правильно:**

```json
"dependencies": {
  "my-shared-lib": "workspace:*",
  "utils": "workspace:*"
}
```

## 2. Структура проекта

Агент должен учитывать текущую структуру монорепозитория при навигации и импортах:

```text
/
├── ui/
│   ├── tui-base/       (Shared Core: Ansi, Keys, IO)
│   ├── tree-explorer/  (App: зависит от tui-base)
│   └── tui/            (App: зависит от tui-base)
└── package.json        (Root config: workspaces = ["ui/*"])
```

## 3. Импорты в коде

После настройки `package.json`, в коде TypeScript/JavaScript импорты работают как обычные npm-пакеты.

**Неправильно (Relative imports between packages):**

```typescript
import { Ansi } from "../../tui-base/src/ansi";
```

**Правильно (Package imports):**

```typescript
import { Ansi } from "tui-base";
```

## 4. Создание новых пакетов

При создании нового пакета в монорепозитории:

1. Создать папку (например, `ui/new-pkg`).
2. Создать `package.json` с уникальным `name`.
3. Указать `"type": "module"`.
4. Если пакет используется другими, добавить `"main"` или `"exports"`.
5. Запустить `bun install` в корне для линковки.
