/**
 * Удаляет файл, конечный symlink или каталог; рекурсия только явно.
 * @remarks Удаление разрушительно. Повтор после успеха возвращает NOT_FOUND. Корень и .git запрещены.
 * @packageDocumentation
 */
import {lstatSync, unlinkSync, rmSync, rmdirSync} from "node:fs"
import {object, boolean} from "../../shared/validation.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {RemovePathInput} from "./contract/input.ts"
import type {RemovePathOutput} from "./contract/output.ts"
export type {RemovePathInput} from "./contract/input.ts"
export type {RemovePathOutput} from "./contract/output.ts"

export function removePath(input: RemovePathInput, context: FilesystemOutput): RemovePathOutput {
  object(input, ["root", "path", "recursive"])
  const recursive = boolean(input.recursive, false, "recursive")
  const root = workspace(context, input.root)
  const path = pathInRoot(root, input.path, {finalSymlink: true})
  const stat = lstatSync(path)
  if (stat.isDirectory()) {
    if (recursive) rmSync(path, {recursive: true, force: false})
    else rmdirSync(path)
  } else unlinkSync(path)
  return {root: input.root, path: relativeTo(root, path), removed: true}
}
