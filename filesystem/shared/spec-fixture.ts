import {mkdtempSync, rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {createFilesystem} from "../index.ts"
import type {FilesystemOutput} from "../contract/output.ts"

export async function fixture<T>(run: (context: FilesystemOutput, root: string) => T | Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), "ai-tools-spec-"))
  try { return await run(createFilesystem({roots: {repo: root}}), root) }
  finally { rmSync(root, {recursive: true, force: true}) }
}

export function hasCode(code: string): (error: unknown) => boolean {
  return error => (error as {code?: string} | null)?.code === code
}
