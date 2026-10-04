/** Публичные формы возможности. */
export declare namespace GitStatus {
  /**
  Читает Git status только назначенного корня и не ищет родительский репозиторий.

  @property [maxEntries=1000] - Максимум возвращаемых файловых записей в диапазоне `[1..5000]`.
  */
  export interface Input {
    maxEntries?: number
  }

  /**
  Ограниченный статус Git в формате porcelain v1 с разбором имён через NUL-разделители.

  @property branch - Текст заголовка ветки из Git; может сообщать о detached HEAD или отсутствии коммитов.

  @property entries - Изменённые, добавленные, удалённые, неотслеживаемые или переименованные пути.
  `index` и `worktree` содержат соответствующие коды porcelain v1; `originalPath` задан для rename/copy.

  @property truncated - `true`, если число записей превысило заданный предел.
  */
  export interface Output {
    branch: string
    entries: Array<{index: string; worktree: string; path: string; originalPath?: string}>
    truncated: boolean
  }
}
