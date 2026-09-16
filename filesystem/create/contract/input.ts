/** Создаёт новый файл с исключительным доступом, не перезаписывая существующий. Внешние данные проверяются исполнителем. */
export interface CreateFileInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
  content: string
  encoding?: "utf8" | "base64"
  createParents?: boolean
}
