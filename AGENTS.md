# AI Tools

Канонический checkout — `/Users/zavx0z/repozitarium/zavx0z/ai`,
Git submodule проекта `zavx0z`. Ветка и история принадлежат Repo AI.

Репозиторий владеет инструментами и существующим HTTP-входом.
Начинать с README.md, DEVELOPMENT.md, MIGRATION.md и контракта изменяемой возможности.
Чат, цикл модели, браузерные адаптеры, ACP и самостоятельный MCP runtime сюда не добавлять.

Нормативный checkout Storybook — `/Users/zavx0z/repozitarium/zavx0z/storybook`:

- [Основания](../storybook/project/notes/foundations/index.md).
- [Предметная архитектура](../storybook/repo/notes/architecture.md).
- [Структурный контракт](../storybook/package/notes/draft-structure.md).
- [Размещение компонентов](../storybook/component/notes/draft-placement.md).
- [Контракты](../storybook/contracts/notes/draft-contracts.md).
- [Экспорты](../storybook/package/notes/draft-exports.md).
- [Документация](../storybook/package/notes/draft-documentation.md).
- [Полное руководство сценариев](../storybook/specs/scenarios/spec/scenario.spec.ts).

Storybook остаётся внешним средством проверки без runtime-зависимости.
Для работающего Storybook использовать его MCP по
[навыку](../storybook/.agents/skills/storybook/SKILL.md).
Не копировать сюда его классификаторы и нормативные проверки.

Область назначается хостом через `@zavx0z/ai-workspace`; модель не выбирает root.
Проверять traversal, symlink, запрет изменения корня, конфликты, byte budgets,
повтор вызова, ошибки до/после эффекта и независимость контекстов.
Тесты используют только свои временные директории. Назначение области не является OS sandbox.

При изменении контрактов/TSDoc обновлять описания через штатный внешний reader
и проверять `check:descriptions` по DEVELOPMENT.md. Сгенерированный JSON не править вручную.

До завершения исполняемой правки: `bun run check`, `bun test`, `npm run test:node`.
Не выдавать чтение исходника, исторический результат и живую проверку за одно свидетельство.
Не менять серверный транспорт без отдельного поручения.

Сохранять main, историю и чужие изменения. Не создавать ветки, клоны или worktree
без прямого поручения. Push требует прямого поручения Владимира.
Не читать и не изменять архивный `/Users/zavx0z/production`.
Временные материалы текущей задачи размещать в `tmp/` или `.local/`, исключённых из Git.
