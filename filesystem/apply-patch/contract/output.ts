/** Результат инструмента после успешного выполнения. */
export interface ApplyPatchOutput {
  root: string
  applied: boolean
  changes: Array<{operation: "add" | "update" | "delete" | "move"; path: string; from?: string; bytes: number}>
}
