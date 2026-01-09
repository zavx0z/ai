import type { LintResult, LinterOptions } from "./types"

interface VSCodeDiagnostic {
  resource: string
  owner: string
  code: string
  severity: number
  message: string
  source: string
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  origin: string
}

export function formatLintResults(results: LintResult, options: LinterOptions = {}): string {
  // Преобразуем ошибки в формат VSCode
  const vsCodeDiagnostics: VSCodeDiagnostic[] = results.errors.map((error) => ({
    resource: error.file,
    owner: error.owner || "typescript",
    code: error.code,
    severity: error.severity || 8,
    message: error.message,
    source: error.source || "ts",
    startLineNumber: error.line,
    startColumn: error.column,
    endLineNumber: error.endLine || error.line,
    endColumn: error.endColumn || error.column + 1,
    origin: error.origin || "extHost5",
  }))

  // Сортируем по файлу, затем по строке, затем по колонке
  vsCodeDiagnostics.sort((a, b) => {
    if (a.resource !== b.resource) {
      return a.resource.localeCompare(b.resource)
    }
    if (a.startLineNumber !== b.startLineNumber) {
      return a.startLineNumber - b.startLineNumber
    }
    return a.startColumn - b.startColumn
  })

  // Выводим статистику в verbose режиме (в stderr, чтобы не мешать JSON)
  if (options.verbose) {
    console.error("\n📊 Статистика линтинга:")
    console.error(`   Всего файлов: ${results.summary.totalFiles}`)
    console.error(`   Файлов с ошибками: ${results.summary.filesWithErrors}`)
    console.error(`   Всего ошибок: ${results.summary.totalErrors}`)

    if (Object.keys(results.summary.errorCountByCode).length > 0) {
      console.error("\n   Распределение по кодам ошибок:")
      Object.entries(results.summary.errorCountByCode)
        .sort(([, a], [, b]) => b - a)
        .forEach(([code, count]) => {
          console.error(`     TS${code}: ${count}`)
        })
    }
  }

  // Возвращаем чистый JSON в формате VSCode
  return JSON.stringify(vsCodeDiagnostics, null, 2)
}
