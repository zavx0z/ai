/** Результат инструмента после успешного выполнения. */
export interface WriteFileOutput {
  root: string
  path: string
  bytes: number
  contentHash: string
}
