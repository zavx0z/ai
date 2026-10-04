/** Метаданные файловой записи, общие для stat и list. */
export declare namespace Zavx0zAiFilesystemAccess {
  /**
  Состояние записи без перехода по конечной символической ссылке.

  @property path - Путь относительно назначенной области.

  @property type - Фактический вид записи lstat.

  @property size - Размер в байтах.

  @property mode - Unix-биты доступа, маска 0777.

  @property modifiedAt - Время изменения в ISO 8601.
  */
  export interface Output {
    path: string
    type: "file" | "directory" | "symlink" | "other"
    size: number
    mode: number
    modifiedAt: string
  }
}
