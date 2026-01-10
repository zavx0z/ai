# ⚡ Принципы разработки Bun: Приоритет API

**Главная цель:** Максимальная производительность (native performance) и минимум зависимостей (zero-dependency).

### 1. Bun Native API — ПРИОРИТЕТ №1

**Всегда начинайте с этого.** Встроенные инструменты Bun быстрее, не требуют зависимостей и оптимизированы на уровне ядра.

* **Файловая система:** `Bun.file()`, `Bun.write()` (вместо `fs`).
* **Сервер:** `Bun.serve()` (вместо `express`/`fastify` для простых задач).
* **Конфиги и данные:** **Нативный импорт YAML/JSON** (`import config from './conf.yaml'`).
* **Утилиты:** `Bun.password`, `Bun.hash`, `Bun.gzipSync`.
* **Shell:** `Bun.$` (вместо `execa`/`shelljs`).

### 2. Node.js Native API — ПРИОРИТЕТ №2

Используйте, если функционала нет в `Bun.*`. Bun обеспечивает полную совместимость со стандартами Node.js.

* **Примеры:** `node:path`, `node:crypto` (для специфичных алгоритмов), `node:stream`.
* **Правило:** Всегда используйте префикс `node:` (например, `import ... from 'node:path'`).

### 3. Сторонние пакеты (NPM) — ПРИОРИТЕТ №3

**Last Resort (крайняя мера).** Подключайте только если задача не решается нативными средствами.

* **Критерии:** Нужна сложная бизнес-логика (ORM, Zod) или специфичный драйвер, которого нет в стандарте.
* **Вопрос перед установкой:** "Могу ли я сделать это на `Bun.*` или `node:*` без потери качества?"

---

### 🧠 Алгоритм принятия решений

1. **Bun Native?** ➡️ Да: **Используем.**
    * *Есть ли `Bun.file`, `Bun.serve` или импорт `.yaml`?*
2. **Node Native?** ➡️ Да: **Используем.**
    * *Есть ли `node:crypto`, `node:utils`?*
3. **NPM Package?** ➡️ **Только при необходимости.**
    * *Нужен ORM, сложная валидация или специфичный SDK.*

---

### 💻 Пример кода (Best Practices)

```javascript
// 1. ✅ Bun Native (Приоритет 1)
// Чтение файлов, переменных и импорт YAML без лишних парсеров
import dbConfig from "./database.yaml"; // Нативная поддержка YAML
import { version } from "./package.json";
const readme = await Bun.file("README.md").text();

// 2. ✅ Node Native (Приоритет 2)
// Функции, отсутствующие в Bun, берем из стандарта Node
import { join } from "node:path";
const fullPath = join(import.meta.dir, "logs");

// 3. ⚠️ NPM Package (Приоритет 3)
// Используем только для сложной логики (например, валидация)
import { z } from "zod";

const UserSchema = z.object({
  username: z.string(),
  role: z.enum(["admin", "user"])
});
```
