/** Trusted host configuration. Root aliases are explicit capabilities, not paths supplied by a remote caller. */
export interface FilesystemInput {
  roots: Record<string, string>
}
