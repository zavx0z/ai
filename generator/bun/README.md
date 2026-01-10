# ⚡ Принципы разработки Bun: Приоритет API

**Главная цель:** Максимальная производительность (native performance) и **zero-dependency**.

### 1. Bun Native API — ПРИОРИТЕТ №1

**Всегда** используйте инструменты Bun. Они написаны на Zig/C++ и работают быстрее JS-аналогов.

* **Файловая система:** `Bun.file()`, `Bun.write()`.
* **Сервер:** `Bun.serve()`.
* **YAML (Static & Dynamic):**
  * **Файлы:** `import config from './conf.yaml'` (нативный импорт).
  * **Строки:** `Bun.YAML.parse(string)` (встроенный парсер).
* **Пароли:** `Bun.password` (Argon2).
* **Shell:** `Bun.$`.

### 2. Web Standard & Node API — ПРИОРИТЕТ №2

Используйте, если метода нет в `Bun.*`, но он есть в стандартах.

* **Криптография (SHA, AES):** `node:crypto` или Web Crypto.
* **Пути:** `node:path`.
* **Потоки:** `node:stream` (если не хватает `ReadableStream`).
* **Правило:** Всегда используйте префикс `node:`.

### 3. Сторонние пакеты (NPM) — ПРИОРИТЕТ №3

**Last Resort.** Только если нативные решения не поддерживают специфичный кейс.

* **Пример:** Специфичный формат даты, которого нет в `Temporal` (когда выйдет) или `Date`, сложная валидация (`zod`).
* **YAML:** Пакет `js-yaml` нужен **только** если `Bun.YAML` не проходит специфичный тест (он покрывает >90% спецификации).

---

### 🧠 Памятка по выбору

| Задача | Решение | Приоритет |
| :--- | :--- | :--- |
| **Прочитать config.yaml** | `import cfg from "./c.yaml"` | ✅ **1 (Bun)** |
| **Распарсить YAML-строку** | `Bun.YAML.parse(str)` | ✅ **1 (Bun)** |
| **Хешировать пароль** | `Bun.password.hash()` | ✅ **1 (Bun)** |
| **SHA-256 / AES** | `node:crypto` | ✅ **2 (Node)** |
| **Валидация данных** | `zod` | ⚠️ **3 (NPM)** |

---

### 💻 Пример кода (Corrected)

```javascript
// 1. ✅ Bun Native (Приоритет 1)
import config from "./config.yaml"; // Статический импорт

// Динамический парсинг (например, YAML пришел по сети)
const yamlString = `
name: Bun
features: [speed, native]
`;
const data = Bun.YAML.parse(yamlString); // Встроенный метод!

// 2. ✅ Node Native (Приоритет 2)
import { createHmac } from "node:crypto";
const sig = createHmac("sha256", "key").update("data").digest("hex");

// 3. ⚠️ NPM Package (Приоритет 3)
// Только если нативный парсер падает на специфичном кейсе (редко)
// import yaml from "js-yaml"; 
