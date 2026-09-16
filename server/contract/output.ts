/** Running HTTP host. Closing it does not modify any registered workspace. */
export interface ServerOutput {
  url: string
  close(): Promise<void>
}
