/**
Читает до 50 файлов с общим бюджетом байтов.

@remarks Ошибки отдельных файлов возвращаются в записи соответствующих путей. Исчерпание бюджета явно отмечается.

@packageDocumentation
*/
import validation from "@ai-tech/input"
const {object, integer, encoding, text} = validation
import ToolError from "@ai-tech/failure"
import access from "@ai-filesystem/access"
const {MAX_BYTES} = access
import readFile from "@ai-filesystem/read"
import type {AiWorkspace} from "@ai/workspace"

import type {AiFilesystemReadMany} from "./contract/index.ts"
export type {AiFilesystemReadMany} from "./contract/index.ts"

/**
Читает список путей по порядку, расходуя общий бюджет на фактически прочитанные байты.

Вход содержит от `1` до `50` путей. `maxBytesPerFile` по умолчанию равен `65536`, общий предел `maxTotalBytes` — `2097152`; каждый предел лежит в `[1..8388608]`. Ошибки конкретных файлов возвращаются внутри соответствующей записи и отмечают результат как усечённый.

@param input - Пути и общие параметры кодировки и бюджетов; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области, передаваемый каждому чтению.

@returns Результат или ошибка для каждого пути, число прочитанных байтов и остаток общего бюджета.

@throws Ошибка `INVALID_INPUT` для неверного списка, элемента или параметров, `ROOT_NOT_ALLOWED` если назначенный корень сменил идентичность; ошибки отдельных чтений находятся в `files`, а не прерывают весь вызов.
*/
export default function readFiles(input: AiFilesystemReadMany.Input, context: AiWorkspace.Output): AiFilesystemReadMany.Output {
  object(input, ["paths", "encoding", "maxBytesPerFile", "maxTotalBytes"])
  context.directory()
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
      const result = readFile({path, encoding: format, maxBytes: Math.min(perFile, remaining)}, context)
      remaining -= result.bytesRead
      truncated ||= result.truncated
      return {path, result}
    } catch (error) {
      const failure = ToolError.from(error)
      truncated = true
      return {path, error: {code: failure.code, message: failure.message}}
    }
  })
  return {files, bytesRead: total - remaining, remainingBytes: remaining, truncated}
}
