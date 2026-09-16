/**
 * Возвращает метаданные пути, не разыменовывая конечную символическую ссылку.
 * @remarks Чтение идемпотентно при неизменном файле. Цель symlink не возвращается.
 * @packageDocumentation
 */
import {object} from "../../shared/validation.ts"
import {workspace, pathInRoot} from "../shared/paths.ts"
import {metadata} from "../shared/files.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {StatPathInput} from "./contract/input.ts"
import type {StatPathOutput} from "./contract/output.ts"
export type {StatPathInput} from "./contract/input.ts"
export type {StatPathOutput} from "./contract/output.ts"

export function statPath(input: StatPathInput, context: FilesystemOutput): StatPathOutput {
  object(input, ["root", "path"])
  const root = workspace(context, input.root)
  const path = pathInRoot(root, input.path, {allowRoot: true, finalSymlink: true})
  return {root: input.root, entry: metadata(root, path)}
}
