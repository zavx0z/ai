/** Представляет отказ инструмента с кодом и безопасной HTTP-диагностикой.
 @packageDocumentation
 */
/**
Отказ инструмента с безопасным сообщением и транспортным статусом.

@property code - Стабильный код причины.

@property status - HTTP-статус, по умолчанию 400.

@property [details] - Разрешённые вызывающим кодом подробности, например завершённые операции patch.

@property from - Нормализует неизвестную ошибку; сохраняет ToolError, скрывает сообщения ОС.
*/
export default class ToolError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message)
    this.name = "ToolError"
    this.code = code
    this.status = status
    this.details = details
  }
  /** Нормализует отказ ОС, скрывая абсолютные пути и вывод команд. */
  static from(error: unknown): ToolError {
    if (error instanceof ToolError) return error
    const code = (error as NodeJS.ErrnoException | null)?.code
    if (code === "ENOENT") return new ToolError("NOT_FOUND", "The requested path does not exist", 404)
    if (code === "EEXIST" || code === "ENOTEMPTY") return new ToolError("CONFLICT", "The destination exists or the directory is not empty", 409)
    if (code === "EACCES" || code === "EPERM" || code === "ELOOP") return new ToolError("PATH_NOT_ALLOWED", "Access to this path is not permitted", 403)
    if (code === "ENOTDIR" || code === "EISDIR") return new ToolError("INVALID_PATH_TYPE", "The path has an incompatible type", 400)
    return new ToolError("INTERNAL_ERROR", "The operation failed", 500)
  }
}
