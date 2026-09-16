import type {ReadFileOutput} from "../../read/contract/output.ts"
/** Результат инструмента после успешного выполнения. */
export interface ReadFilesOutput {
  root: string
  files: Array<{path: string; result: ReadFileOutput} | {path: string; error: {code: string; message: string}}>
  bytesRead: number
  remainingBytes: number
  truncated: boolean
}
