/** Explicit host configuration. No home-directory or workspace defaults are inferred. */
export interface ServerInput {
  roots: Record<string, string>
  token: string
  hostname?: string
  /** Default 8787; 0 asks the OS for a free port in integration tests. */
  port?: number
  repositoryRoot?: string
  log?: boolean
}
