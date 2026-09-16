/** Возвращает метаданные пути, не разыменовывая конечную символическую ссылку. Внешние данные проверяются исполнителем. */
export interface StatPathInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
}
