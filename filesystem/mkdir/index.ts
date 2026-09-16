/**
 * Создаёт каталог внутри разрешённого корня.
 * @remarks С recursive:true повтор для существующего каталога успешен; created:false. Корень изменять нельзя.
 * @packageDocumentation
 */
import {mkdirSync, lstatSync} from "node:fs"
import {object, boolean} from "../../shared/validation.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {MakeDirectoryInput} from "./contract/input.ts"
import type {MakeDirectoryOutput} from "./contract/output.ts"
export type {MakeDirectoryInput} from "./contract/input.ts"
export type {MakeDirectoryOutput} from "./contract/output.ts"

export function makeDirectory(input: MakeDirectoryInput, context: FilesystemOutput): MakeDirectoryOutput {
  object(input, ["root", "path", "recursive"])
  const recursive = boolean(input.recursive, false, "recursive")
  const root = workspace(context, input.root)
  const path = pathInRoot(root, input.path, {missing: true})
  let existed = false
  try { existed = lstatSync(path).isDirectory() } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  mkdirSync(path, {recursive})
  return {root: input.root, path: relativeTo(root, path), created: !existed}
}
