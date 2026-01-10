export type ActionType = "replace" | "create" | "delete" | "rename" | "overwrite"

export interface FileOperation {
  file: string // Путь к файлу
  action: ActionType
  search?: string // Точный фрагмент кода (для replace/delete)
  replace?: string // Новый код (для replace/create/overwrite)
  newPath?: string // Новый путь (для rename)
}

export interface EditRequest {
  description: string
  operations: FileOperation[]
}
