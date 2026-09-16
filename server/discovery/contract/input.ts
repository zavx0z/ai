/** Trusted source checkout used only for structural metadata. It is not a filesystem tool root. */
export interface DiscoveryInput {
  repositoryRoot: string
  runnable: ReadonlySet<string>
}
