/**
Атомарно заменяет содержимое существующего обычного файла.

@remarks Не создаёт отсутствующий файл и не перезапускает процессы. Повтор записывает те же байты, сохраняет биты доступа, но заменяет inode и обновляет время изменения; несовпавший `expectedHash` вызывает `CONFLICT`.

@packageDocumentation
*/
import validation from "@ai-tech/input"
const {object, text, encoding, hash} = validation
import access from "@ai-filesystem/access"
const {decode, digest, replaceFile} = access
import type {AiWorkspace} from "@ai/workspace"

import type {AiFilesystemWrite} from "./contract/index.ts"
export type {AiFilesystemWrite} from "./contract/index.ts"

/**
Заменяет содержимое существующего обычного файла атомарным переименованием временного файла.

Строка декодируется как UTF-8 по умолчанию или как канонический Base64; результат ограничен `8388608` байтами. Необязательный `expectedHash` сверяется с SHA-256 текущего содержимого до замены и возвращает конфликт при несовпадении.

@param input - Относительный путь и новое содержимое; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительный путь, число записанных байтов и SHA-256 нового содержимого.

@throws Ошибка `INVALID_INPUT` для формы, кодировки или хеша; `ROOT_NOT_ALLOWED` при смене идентичности корня, `LIMIT_EXCEEDED` при превышении бюджета, `INVALID_PATH_TYPE` для не обычного файла, `CONFLICT` при несовпадении хеша, а также ошибки файловой системы.
*/
export default function writeFile(input: AiFilesystemWrite.Input, context: AiWorkspace.Output): AiFilesystemWrite.Output {
  object(input, ["path", "content", "encoding", "expectedHash"])
  const data = decode(text(input.content, "content", true), encoding(input.encoding))
  const expected = hash(input.expectedHash)
  context.directory()
  const path = context.resolve(input.path)
  replaceFile(path, data, expected)
  return {path: context.relative(path), bytes: data.length, contentHash: digest(data)}
}
