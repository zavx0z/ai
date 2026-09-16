/**
 * Читает ограниченный диапазон байтов файла.
 * @remarks Возвращает фактически прочитанные байты. Чтение не меняет файл и не запускает replay.
 * @packageDocumentation
 */
import {object, integer, encoding} from "../../shared/validation.ts"
import {workspace, pathInRoot, relativeTo} from "../shared/paths.ts"
import {readChunk, digest, MAX_BYTES} from "../shared/files.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {ReadFileInput} from "./contract/input.ts"
import type {ReadFileOutput} from "./contract/output.ts"
export type {ReadFileInput} from "./contract/input.ts"
export type {ReadFileOutput} from "./contract/output.ts"

export function readFile(input: ReadFileInput, context: FilesystemOutput): ReadFileOutput {
  object(input, ["root", "path", "offset", "maxBytes", "encoding"])
  const root = workspace(context, input.root)
  const offset = integer(input.offset, 0, 0, Number.MAX_SAFE_INTEGER, "offset")
  const maxBytes = integer(input.maxBytes, 65536, 1, MAX_BYTES, "maxBytes")
  const format = encoding(input.encoding)
  const path = pathInRoot(root, input.path)
  const {data, size} = readChunk(path, offset, maxBytes)
  return {root: input.root, path: relativeTo(root, path), content: data.toString(format), encoding: format,
    offset, bytesRead: data.length, size, truncated: offset + data.length < size,
    contentHash: offset === 0 && data.length === size ? digest(data) : null}
}
