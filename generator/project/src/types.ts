export type ChangeType = 'insert' | 'replace' | 'delete'
export type ActionType = 'edit' | 'create' | 'delete' | 'rename'

export interface FileChange {
  type: ChangeType
  line: number
  endLine?: number
  content?: string
}

export interface FileOperation {
  file: string
  action: ActionType
  changes?: FileChange[]
  newPath?: string
  newContent?: string
}

export interface EditRules {
  description: string
  changes: FileOperation[]
}