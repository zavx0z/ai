/** Результат инструмента после успешного выполнения. */
export interface CreateFileOutput {
  root: string
  path: string
  bytes: number
  contentHash: string
}
