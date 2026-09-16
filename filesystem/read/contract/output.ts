/** Результат инструмента после успешного выполнения. */
export interface ReadFileOutput {
  root: string
  path: string
  content: string
  encoding: "utf8" | "base64"
  offset: number
  bytesRead: number
  size: number
  truncated: boolean
  /** Hash only when this response contains the whole file, otherwise null. */
  contentHash: string | null
}
