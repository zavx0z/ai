/**
 * Читает до 50 файлов с общим бюджетом байтов.
 * @remarks Ошибки отдельных файлов не скрываются. Исчерпание бюджета явно отмечается.
 * @packageDocumentation
 */
import {object, integer, encoding, text} from "../../shared/validation.ts"
import {ToolError, asToolError} from "../../shared/errors.ts"
import {workspace} from "../shared/paths.ts"
import {MAX_BYTES} from "../shared/files.ts"
import {readFile} from "../read/index.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {ReadFilesInput} from "./contract/input.ts"
import type {ReadFilesOutput} from "./contract/output.ts"
export type {ReadFilesInput} from "./contract/input.ts"
export type {ReadFilesOutput} from "./contract/output.ts"

export function readFiles(input: ReadFilesInput, context: FilesystemOutput): ReadFilesOutput {
  object(input, ["root", "paths", "encoding", "maxBytesPerFile", "maxTotalBytes"])
  workspace(context, input.root)
  if (!Array.isArray(input.paths) || input.paths.length === 0 || input.paths.length > 50) throw new ToolError("INVALID_INPUT", "paths must contain 1 to 50 strings")
  input.paths.forEach(path => text(path, "path"))
  const format = encoding(input.encoding)
  const perFile = integer(input.maxBytesPerFile, 65536, 1, MAX_BYTES, "maxBytesPerFile")
  const total = integer(input.maxTotalBytes, 2 * 1024 * 1024, 1, MAX_BYTES, "maxTotalBytes")
  let remaining = total
  let truncated = false
  const files = input.paths.map(path => {
    try {
      if (remaining === 0) throw new ToolError("LIMIT_EXCEEDED", "The shared read budget is exhausted", 413)
      const result = readFile({root: input.root, path, encoding: format, maxBytes: Math.min(perFile, remaining)}, context)
      remaining -= result.bytesRead
      truncated ||= result.truncated
      return {path, result}
    } catch (error) {
      const failure = asToolError(error)
      truncated = true
      return {path, error: {code: failure.code, message: failure.message}}
    }
  })
  return {root: input.root, files, bytesRead: total - remaining, remainingBytes: remaining, truncated}
}
