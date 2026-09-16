/**
 * Перемещает путь внутри одного корня, не перезаписывая существующую цель.
 * @remarks Повтор не идемпотентен. Проверка цели не является межпроцессной блокировкой; каталоги должны быть доверенными.
 * @packageDocumentation
 */
import {lstatSync, renameSync} from "node:fs"
import {relative, sep} from "node:path"
import {object} from "../../shared/validation.ts"
import {ToolError} from "../../shared/errors.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {RenamePathInput} from "./contract/input.ts"
import type {RenamePathOutput} from "./contract/output.ts"
export type {RenamePathInput} from "./contract/input.ts"
export type {RenamePathOutput} from "./contract/output.ts"

export function renamePath(input: RenamePathInput, context: FilesystemOutput): RenamePathOutput {
  object(input, ["root", "from", "to"])
  const root = workspace(context, input.root)
  const from = pathInRoot(root, input.from)
  const to = pathInRoot(root, input.to, {missing: true})
  try {
    lstatSync(to)
    throw new ToolError("CONFLICT", "Destination already exists", 409)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  const inside = relative(from, to)
  if (lstatSync(from).isDirectory() && inside !== ".." && !inside.startsWith(`..${sep}`)) {
    throw new ToolError("INVALID_INPUT", "A directory cannot be moved into itself")
  }
  renameSync(from, to)
  return {root: input.root, from: relativeTo(root, from), to: relativeTo(root, to), renamed: true}
}
