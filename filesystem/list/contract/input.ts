/** Строит ограниченный инвентарь каталога без обхода symlink и .git. Внешние данные проверяются исполнителем. */
export interface ListFilesInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  path?: string
  recursive?: boolean
  /** Default 3, range 1..10. */
  maxDepth?: number
  /** Default 1000, range 1..5000. */
  maxEntries?: number
}
