/** Удаляет файл, конечный symlink или каталог; рекурсия только явно. Внешние данные проверяются исполнителем. */
export interface RemovePathInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
  recursive?: boolean
}
