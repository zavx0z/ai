import type { LintResult, LinterOptions } from "./src/types"
import { parseTypeScriptFile } from "./src/parser"
import { validateFilePath, validateOptions } from "./src/validator"
import path from "path"

export interface FileContent {
  path: string
  content: string
}

export async function lintFiles(files: FileContent[], options: LinterOptions = {}): Promise<LintResult> {
  // Валидация опций
  validateOptions(options)

  const allErrors = []

  // Линтинг каждого файла
  for (const file of files) {
    // Проверяем, что это TypeScript файл
    if (!validateFilePath(file.path)) {
      if (options.verbose) {
        console.warn(`⚠️ Пропуск не-TypeScript файла: ${path.relative(process.cwd(), file.path)}`)
      }
      continue
    }

    try {
      const errors = await parseTypeScriptFile(file.path, file.content, options)
      allErrors.push(...errors)
    } catch (error) {
      throw new Error(
        `Ошибка при обработке файла ${file.path}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Подсчет статистики
  const filesWithErrors = new Set(allErrors.map((e) => e.file)).size
  const errorCountByCode = allErrors.reduce((acc, error) => {
    acc[error.code] = (acc[error.code] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    errors: allErrors,
    summary: {
      totalFiles: files.length,
      filesWithErrors,
      totalErrors: allErrors.length,
      errorCountByCode,
    },
  }
}
