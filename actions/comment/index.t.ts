export type CommentType = "single-line" | "multi-line" | "jsdoc"

export interface CommentMetadata {
  id: string
  text: string
  type: CommentType
  start: number
  end: number
  line: number
  attachedTo?: {
    kind: string
    name?: string
  }
}

export interface RemovalResult {
  cleanedCode: string
  metadata: CommentMetadata[]
  sourceFile: string
  originalHash?: string
  cleanedHash?: string
}

export interface MetadataFile {
  sourceFile: string
  cleanedFile: string
  comments: CommentMetadata[]
  timestamp: string
  originalHash: string
  cleanedHash: string
}

export interface RemovalOptions {
  preserveNewlines?: boolean
  removeOnly?: CommentType[]
  keepOnly?: CommentType[]
  includeShebang?: boolean
}
