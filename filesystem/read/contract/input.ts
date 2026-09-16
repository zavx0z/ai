/** Читает ограниченный диапазон байтов файла. Внешние данные проверяются исполнителем. */
export interface ReadFileInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Relative path. No parent traversal, Git metadata or symlink traversal. */
  path: string
  /** Byte offset, default 0. */
  offset?: number
  /** Default 65536; maximum 8388608. */
  maxBytes?: number
  /** Use base64 for exact binary data and byte ranges splitting a UTF-8 character. */
  encoding?: "utf8" | "base64"
}
