/**
Создаёт новый файл с исключительным доступом, не перезаписывая существующий.

@remarks Повтор после успеха завершается ошибкой существующего пути (`EEXIST` при прямом вызове). При `createParents` ошибка записи может оставить созданные каталоги.

@packageDocumentation
*/
import {mkdirSync, writeFileSync} from "node:fs"
import {dirname} from "node:path"
import validation from "@ai-tech/input"
const {object, text, encoding, boolean} = validation
import access from "@ai-filesystem/access"
const {decode, digest} = access
import type {AiWorkspace} from "@ai/workspace"

import type {AiFilesystemCreate} from "./contract/index.ts"
export type {AiFilesystemCreate} from "./contract/index.ts"

/**
Создаёт файл с режимом `0600`, используя исключительное открытие, поэтому существующий путь не перезаписывается.

Содержимое декодируется как UTF-8 по умолчанию или как канонический Base64 и ограничено `8388608` байтами. Родительские каталоги создаются только при `createParents: true`; если запись затем завершится ошибкой, созданные каталоги могут остаться.

@param input - Относительный путь и содержимое нового файла; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительный путь, число байтов и SHA-256 записанного содержимого.

@throws Ошибка `INVALID_INPUT` при неверной форме или кодировке, `ROOT_NOT_ALLOWED` при смене идентичности корня, `LIMIT_EXCEEDED` при превышении бюджета; `EEXIST` и другие ошибки записи файловой системы пробрасываются напрямую.
*/
export default function createFile(input: AiFilesystemCreate.Input, context: AiWorkspace.Output): AiFilesystemCreate.Output {
  object(input, ["path", "content", "encoding", "createParents"])
  const data = decode(text(input.content, "content", true), encoding(input.encoding))
  const parents = boolean(input.createParents, false, "createParents")
  context.directory()
  const path = context.resolve(input.path, {missing: true})
  if (parents) mkdirSync(dirname(path), {recursive: true})
  writeFileSync(path, data, {flag: "wx", mode: 0o600})
  return {path: context.relative(path), bytes: data.length, contentHash: digest(data)}
}
