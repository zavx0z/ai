import type { LintResult, LinterOptions } from "./types"

interface AgentDiagnostic {
  file: string
  code: string
  message: string
  context: string
}

export function formatLintResults(results: LintResult, options: LinterOptions = {}): string {
  // Сортируем исходные ошибки по файлу и строке перед преобразованием
  const sortedErrors = [...results.errors].sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    return a.line - b.line
  })

  // Преобразуем ошибки в лаконичный формат для агента
  const agentDiagnostics: AgentDiagnostic[] = sortedErrors.map((error) => ({
    file: error.file,
    code: `TS${error.code}`,
    message: error.message,
    context: error.context,
  }))

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

  // Возвращаем чистый JSON в формате для агента
  return JSON.stringify(agentDiagnostics, null, 2)
}
