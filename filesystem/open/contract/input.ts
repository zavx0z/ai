/** Проверяет доступность зарегистрированного корня. Внешние данные проверяются исполнителем. */
export interface OpenWorkspaceInput {
  /** Alias from filesystem/roots, never an absolute server path. */
  root: string
}
