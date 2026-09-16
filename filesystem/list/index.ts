/**
 * Строит ограниченный инвентарь каталога без обхода symlink и .git.
 * @remarks Обход читает каталог постепенно. Порядок усечённой выборки зависит от файловой системы.
 * @packageDocumentation
 */
import {opendirSync, lstatSync} from "node:fs"
import {join} from "node:path"
import {object, integer, boolean} from "../../shared/validation.ts"
import {ToolError} from "../../shared/errors.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import {metadata} from "../shared/files.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {ListFilesInput} from "./contract/input.ts"
import type {ListFilesOutput} from "./contract/output.ts"
export type {ListFilesInput} from "./contract/input.ts"
export type {ListFilesOutput} from "./contract/output.ts"

export function listFiles(input: ListFilesInput, context: FilesystemOutput): ListFilesOutput {
  object(input, ["root", "path", "recursive", "maxDepth", "maxEntries"])
  const root = workspace(context, input.root)
  const start = pathInRoot(root, input.path ?? ".", {allowRoot: true})
  const recursive = boolean(input.recursive, false, "recursive")
  const maxDepth = integer(input.maxDepth, 3, 1, 10, "maxDepth")
  const maxEntries = integer(input.maxEntries, 1000, 1, 5000, "maxEntries")
  if (!lstatSync(start).isDirectory()) throw new ToolError("INVALID_PATH_TYPE", "Path must be a directory")
  const entries: ListFilesOutput["entries"] = []
  let truncated = false
  let depthLimited = false
  const visit = (directory: string, depth: number): void => {
    const handle = opendirSync(directory)
    try {
      let child
      while ((child = handle.readSync()) !== null) {
        if (child.name.toLowerCase() === ".git") continue
        if (entries.length === maxEntries) { truncated = true; return }
        const path = join(directory, child.name)
        const entry = metadata(root, path)
        entries.push(entry)
        if (recursive && entry.type === "directory") {
          if (depth < maxDepth) visit(path, depth + 1)
          else depthLimited = true
          if (truncated) return
        }
      }
    } finally { handle.closeSync() }
  }
  visit(start, 1)
  entries.sort((a, b) => a.path.localeCompare(b.path))
  return {root: input.root, path: relativeTo(root, start), entries, truncated: truncated || depthLimited, depthLimited}
}
