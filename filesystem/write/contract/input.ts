/** Атомарно заменяет содержимое существующего обычного файла. Внешние данные проверяются исполнителем. */
export interface WriteFileInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
  content: string
  encoding?: "utf8" | "base64"
  /** Optimistic precondition within this host, not a cross-process lock. */
  expectedHash?: string
}
