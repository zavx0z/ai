# Работа с AI Tools

## Установка и запуск

Для разработки нужен Bun 1.4.2 или новее. Исполнение HTTP и инструментов
поддерживается на Node.js 22.22.2 и новее. Проверка выполнена на 22.22.2. Git status использует установленный Git.

```sh
bun install
export AI_TOOLS_DIRECTORY='/absolute/path/to/checkout'
export AI_TOOLS_TOKEN="$(openssl rand -hex 32)"
bun run start
```

Для Node: `npm run start:node`. Каталог задаётся хостом, существует заранее
и может не быть Git checkout. Только `git/status` требует checkout точно
в назначенной директории, без поиска родительского репозитория.
`AI_TOOLS_HOST` по умолчанию `127.0.0.1`, `AI_TOOLS_PORT` — `8787`.
`.env` автоматически не загружается. Токен не сохраняется в Git.

Прежняя карта `AI_TOOLS_ROOTS` больше не используется. Вместо неё обязательна
одна `AI_TOOLS_DIRECTORY`; неявного назначения из cwd или домашнего каталога нет.
Несколько сессий получают разные контексты `createWorkspace({directory})`.
HTTP-хост создаёт свой контекст до начала прослушивания. Внутреннее приложение
может передать такой контекст обработчику через `workspace`.

## Публичные возможности

Каждая операция предоставляет `default` и собственное type-only пространство
с формами `Input`/`Output` в `contract/index.ts`.

| Адрес HTTP | Пакет | Возможность |
| --- | --- | --- |
| `ai/filesystem/stat` | `@filesystem/stat` | Метаданные, включая конечную ссылку |
| `ai/filesystem/list` | `@filesystem/list` | Ограниченный список каталога |
| `ai/filesystem/read` | `@filesystem/read` | Диапазон байтов одного файла |
| `ai/filesystem/read-many` | `@filesystem/read-many` | Пакет чтения с общим бюджетом |
| `ai/filesystem/create` | `@filesystem/create` | Создание без перезаписи |
| `ai/filesystem/write` | `@filesystem/write` | Замена существующего файла |
| `ai/filesystem/mkdir` | `@filesystem/mkdir` | Создание каталога |
| `ai/filesystem/remove` | `@filesystem/remove` | Удаление записи |
| `ai/filesystem/rename` | `@filesystem/rename` | Перемещение без перезаписи |
| `ai/filesystem/apply-patch` | `@filesystem/apply-patch` | Планирование и применение текстового patch |
| `ai/git/status` | `@git/status` | Ограниченный Git status |

`filesystem/roots` и `filesystem/open` удалены: выбор alias больше не является
действием агента. Метаданные самой области доступны через `stat({path: "."})`,
её список — через `list({})`.

```ts
import createWorkspace from "@ai/workspace"
import readFile from "@filesystem/read"

const workspace = createWorkspace({directory: "/absolute/path/to/checkout"})
const result = readFile({path: "README.md", maxBytes: 65536}, workspace)
```

Абсолютный путь хранится внутри контекста исполнителя. Контекст не меняет
`process.cwd()` и не выбирается из JSON запроса. Старое поле `root`, как любое
неизвестное поле, отклоняется до побочного эффекта. Результаты не содержат alias.

## HTTP

`GET /tools` и `POST /tools` с `{}` возвращают обзор. Все запросы требуют
`Authorization: Bearer <token>`. Оболочка остаётся `{node?, action?, input?}`.

```sh
curl --fail-with-body http://127.0.0.1:8787/tools \
  -H "Authorization: Bearer $AI_TOOLS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"node":"ai/filesystem/read","action":"run","input":{"path":"README.md","maxBytes":65536}}'
```

Без `action` запрос описывает узел. `input: {"view":"contract"}` возвращает
`{node, view, format: "typescript", source}` с полным исходником пространства
контракта. Прежние отдельные поля `input`/`output` с исходниками заменены `source`,
поскольку обе формы теперь принадлежат одному namespace.
`view: "scenarios"` возвращает исходник и `executed: false`, без запуска тестов.
Обзор извлекается из TSDoc публичного входа, а не из README.

Discovery раскрывает пакеты из корневых workspace glob. Исполняются только
явные bindings. Технические узлы описываются, но недоступны для удалённого запуска.
Пользовательский адрес не превращается в произвольный import или shell-команду.
Новых transport, версий протокола, WebSocket и прогресса не добавлено.
Интеграция с конкретным клиентом Wazy не проверена.

## Ограничения и диагностика

Сохранены запреты traversal, абсолютных путей, `.git` и переходов через symlink.
`stat` описывает конечную ссылку, `remove` удаляет её саму. Корень нельзя изменить
файловой операцией. Рекурсивное удаление требует явного флага.
Контекст также отклоняет замену назначенной директории по dev/inode или symlink.

Чтение/изменение ограничено 8 MiB, тело HTTP — 12 MiB. `expectedHash` проверяет
ожидаемое содержимое перед заменой. `apply-patch` сначала проверяет весь план;
ошибка I/O во время применения возвращает `PARTIAL_FAILURE` с `details.completed`
и текущей операцией. Многофайловая атомарность не обещается.

Доверенные рабочие директории и владелец машины остаются предпосылкой:
это не OS sandbox и не защита от враждебных межпроцессных гонок путей.
`expectedHash` не является межпроцессной блокировкой. Токен разрешает все
опубликованные действия, включая удаление. Browser Origin-запросы отклоняются;
TLS для удалённого доступа настраивается отдельно.

HTTP нормализует ошибки ОС без раскрытия абсолютных путей. Статусы:
400 — ввод, 401 — токен, 403 — запрет, 404 — отсутствие,
409 — конфликт, 413 — лимит, 500 — внутренний сбой.
JSONL диагностика содержит requestId, метод, узел, действие, статус, длительность
и код ошибки; содержимое файлов, аргументы и токены не записываются.
Автоматического повтора изменяющих запросов нет.

## Проверки

```sh
bun run check
bun test
npm run test:node
```

`scenario.spec.ts` содержит успешные примеры на `bun:test`; ожидаемые отказы
находятся в отдельных spec, внутренние проверки — в test. Все временные данные
принадлежат тестам и освобождаются ими. Node-маршрут — отдельная интеграционная
проверка публичных функций и двух настоящих HTTP-хостов; он не повторяет весь
Bun-набор. Свежие результаты и границы проверки фиксируются в задаче.
