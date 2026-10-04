/**
Читает ограниченный диапазон байтов файла.

@remarks Возвращает фактически прочитанные байты и не меняет файл.

@packageDocumentation
*/
import validation from "@tech/input"
const {object, integer, encoding} = validation
import access from "@filesystem/access"
const {readChunk, digest, MAX_BYTES} = access
import type {AiWorkspace} from "@ai/workspace"

import type {FilesystemRead} from "./contract/index.ts"
export type {FilesystemRead} from "./contract/index.ts"

/**
Читает участок обычного файла, не превышающий заданный бюджет байтов.

`offset` по умолчанию равен `0`; `maxBytes` — `65536` и ограничен диапазоном `[1..8388608]`. Целый файл получает SHA-256, частичный ответ — `contentHash: null`.

@param input - Относительный путь, смещение, предел размера ответа и кодировка `utf8` или `base64`; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Декодированное содержимое, фактическое число прочитанных байтов, исходный размер и признак неполного чтения.

@throws Ошибки `INVALID_INPUT`, `ROOT_NOT_ALLOWED`, `PATH_NOT_ALLOWED`, `INVALID_PATH_TYPE` и `LIMIT_EXCEEDED` при проверке аргументов, корня, пути и чтении; ошибки ОС, включая `ENOENT`, пробрасываются напрямую.
*/
export default function readFile(input: FilesystemRead.Input, context: AiWorkspace.Output): FilesystemRead.Output {
  object(input, ["path", "offset", "maxBytes", "encoding"])
  context.directory()
  const offset = integer(input.offset, 0, 0, Number.MAX_SAFE_INTEGER, "offset")
  const maxBytes = integer(input.maxBytes, 65536, 1, MAX_BYTES, "maxBytes")
  const format = encoding(input.encoding)
  const path = context.resolve(input.path)
  const {data, size} = readChunk(path, offset, maxBytes)
  return {path: context.relative(path), content: data.toString(format), encoding: format,
    offset, bytesRead: data.length, size, truncated: offset + data.length < size,
    contentHash: offset === 0 && data.length === size ? digest(data) : null}
}
