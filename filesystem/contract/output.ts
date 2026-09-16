/** Canonical roots owned by one host. Paths are internal and are never accepted through HTTP tool input. */
export interface FilesystemOutput {
  readonly roots: Readonly<Record<string, string>>
}
