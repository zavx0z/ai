import type {FileEntry} from "../../shared/types.ts"
/** Результат инструмента после успешного выполнения. */
export interface ListFilesOutput {
  root: string
  path: string
  entries: FileEntry[]
  truncated: boolean
  depthLimited: boolean
}
