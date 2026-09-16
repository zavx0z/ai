/**
 * Атомарно заменяет содержимое существующего обычного файла.
 * @remarks Не создаёт отсутствующий файл, не перезапускает процессы. Повтор сохраняет байты, но обновляет inode/mtime; stale expectedHash даёт CONFLICT.
 * @packageDocumentation
 */
import {object, text, encoding, hash} from "../../shared/validation.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import {decode, digest, replaceFile} from "../shared/files.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {WriteFileInput} from "./contract/input.ts"
import type {WriteFileOutput} from "./contract/output.ts"
export type {WriteFileInput} from "./contract/input.ts"
export type {WriteFileOutput} from "./contract/output.ts"

export function writeFile(input: WriteFileInput, context: FilesystemOutput): WriteFileOutput {
  object(input, ["root", "path", "content", "encoding", "expectedHash"])
  const data = decode(text(input.content, "content", true), encoding(input.encoding))
  const expected = hash(input.expectedHash)
  const root = workspace(context, input.root)
  const path = pathInRoot(root, input.path)
  replaceFile(path, data, expected)
  return {root: input.root, path: relativeTo(root, path), bytes: data.length, contentHash: digest(data)}
}
