/** Создаёт каталог внутри разрешённого корня. Внешние данные проверяются исполнителем. */
export interface MakeDirectoryInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
  recursive?: boolean
}
