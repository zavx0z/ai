import type {FileEntry} from "../../shared/types.ts"
/** Результат инструмента после успешного выполнения. */
export interface StatPathOutput {
  root: string
  entry: FileEntry
}
