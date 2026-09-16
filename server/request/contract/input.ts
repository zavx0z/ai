import type {FilesystemOutput} from "../../../filesystem/contract/output.ts"

/** Trusted HTTP-host dependencies; these fields never come from a remote tool call. */
export interface RequestInput {
  filesystem: FilesystemOutput
  token: string
  repositoryRoot: string
  logger?: (event: {requestId: string; method: string; node?: string; action?: string; status: number; durationMs: number; errorCode?: string}) => void
}
