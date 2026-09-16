/**
 * Создаёт новый файл с исключительным доступом, не перезаписывая существующий.
 * @remarks Повтор после успеха возвращает CONFLICT. При createParents ошибка ввода/вывода может оставить созданные директории.
 * @packageDocumentation
 */
import {mkdirSync, writeFileSync} from "node:fs"
import {dirname} from "node:path"
import {object, text, encoding, boolean} from "../../shared/validation.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import {decode, digest} from "../shared/files.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {CreateFileInput} from "./contract/input.ts"
import type {CreateFileOutput} from "./contract/output.ts"
export type {CreateFileInput} from "./contract/input.ts"
export type {CreateFileOutput} from "./contract/output.ts"

export function createFile(input: CreateFileInput, context: FilesystemOutput): CreateFileOutput {
  object(input, ["root", "path", "content", "encoding", "createParents"])
  const data = decode(text(input.content, "content", true), encoding(input.encoding))
  const parents = boolean(input.createParents, false, "createParents")
  const root = workspace(context, input.root)
  const path = pathInRoot(root, input.path, {missing: true})
  if (parents) mkdirSync(dirname(path), {recursive: true})
  writeFileSync(path, data, {flag: "wx", mode: 0o600})
  return {root: input.root, path: relativeTo(root, path), bytes: data.length, contentHash: digest(data)}
}
