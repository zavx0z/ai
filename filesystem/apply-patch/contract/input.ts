/** Применяет текстовый patch формата Begin Patch с полной предварительной проверкой. Внешние данные проверяются исполнителем. */
export interface ApplyPatchInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  /** Add File, Update File, Delete File and Move to; UTF-8 only. */
  patch: string
  /** Validate without creating directories or changing files. Default false. */
  dryRun?: boolean
}
