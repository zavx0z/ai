/** Read-only Git status of exactly the configured root, never an ancestor repository. */
export interface GitStatusInput {
  root: string
  /** Default 1000; maximum 5000. */
  maxEntries?: number
}
