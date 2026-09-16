/** Bounded porcelain-v1 status. File names are parsed using NUL delimiters. */
export interface GitStatusOutput {
  root: string
  branch: string
  entries: Array<{index: string; worktree: string; path: string; originalPath?: string}>
  truncated: boolean
}
