/** Читает до 50 файлов с общим бюджетом байтов. Внешние данные проверяются исполнителем. */
export interface ReadFilesInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  paths: string[]
  encoding?: "utf8" | "base64"
  /** Default 65536, maximum 8388608. */
  maxBytesPerFile?: number
  /** Default 2097152, maximum 8388608. */
  maxTotalBytes?: number
}
