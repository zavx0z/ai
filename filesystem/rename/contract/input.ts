/** Перемещает путь внутри одного корня, не перезаписывая существующую цель. Внешние данные проверяются исполнителем. */
export interface RenamePathInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
  from: string
  to: string
}
