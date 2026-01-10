# AI File Editor

Утилита для надежного редактирования файлов с помощью ИИ, использующая метод "Search & Replace" (вместо ненадежных номеров строк).

## Особенности

* ✅ **Search & Replace:** Ищет уникальные фрагменты кода, игнорируя сдвиги строк.
* ✅ **Fuzzy Match:** "Умный" поиск игнорирует различия в пробелах и отступах.
* ✅ **Overwrite:** Поддержка полной перезаписи для сильного рефакторинга.
* ✅ **Safety First:** Сухой прогон (`--check`) и строгая валидация.

## Использование

```bash
# Применение изменений
bun run cli.ts changes.json

# Тестовый прогон (без записи на диск)
bun run cli.ts changes.json --check
```

## Формат JSON

```json
{
  "description": "Описание изменений",
  "operations": [
    {
      "file": "path/to/file.ts",
      "action": "replace",
      "search": "const old = 1",
      "replace": "const newVar = 2"
    },
    {
      "file": "path/to/config.ts",
      "action": "overwrite",
      "replace": "{ \"version\": \"2.0.0\" }"
    }
  ]
}

