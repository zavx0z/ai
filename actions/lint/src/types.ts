export interface LintError {
  file: string
  line: number
  column: number
  message: string
  code: string
  context: string
  // Дополнительные поля для VSCode формата
  endLine?: number
  endColumn?: number
  severity?: number
  source?: string
  owner?: string
  origin?: string
}

export interface LintResult {
  errors: LintError[]
  summary: {
    totalFiles: number
    filesWithErrors: number
    totalErrors: number
    errorCountByCode: Record<string, number>
  }
}

export interface LinterOptions {
  strict?: boolean
  verbose?: boolean
  tsconfigPath?: string
}
