/**
 * Создаёт файловый контекст из явно разрешённых директорий хоста.
 * Не запускает процессы, не сканирует домашнюю директорию и не открывает HTTP.
 * @packageDocumentation
 */
import {realpathSync, statSync} from "node:fs"
import {isAbsolute} from "node:path"
import {ToolError} from "../shared/errors.ts"
import {object, text} from "../shared/validation.ts"
import type {FilesystemInput} from "./contract/input.ts"
import type {FilesystemOutput} from "./contract/output.ts"
export type {FilesystemInput} from "./contract/input.ts"
export type {FilesystemOutput} from "./contract/output.ts"

export function createFilesystem(input: FilesystemInput): FilesystemOutput {
  object(input, ["roots"])
  if (input.roots === null || typeof input.roots !== "object" || Array.isArray(input.roots)) {
    throw new ToolError("INVALID_INPUT", "roots must be an alias-to-absolute-path object")
  }
  const entries = Object.entries(input.roots)
  if (entries.length === 0 || entries.length > 64) throw new ToolError("INVALID_INPUT", "Configure between 1 and 64 roots")
  const roots: Record<string, string> = Object.create(null)
  for (const [alias, path] of entries) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(alias)) throw new ToolError("INVALID_INPUT", "Invalid root alias")
    text(path, "root path")
    if (!isAbsolute(path)) throw new ToolError("INVALID_INPUT", "Configured root paths must be absolute")
    const canonical = realpathSync(path)
    if (!statSync(canonical).isDirectory()) throw new ToolError("INVALID_INPUT", "Configured roots must be directories")
    roots[alias] = canonical
  }
  return Object.freeze({roots: Object.freeze(roots)})
}
