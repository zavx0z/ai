/**
Удаляет файл, конечную символическую ссылку или каталог; рекурсия только явно.

@remarks Удаление необратимо. Повтор после успеха завершается ошибкой отсутствующего пути. Корень и `.git` запрещены.

@packageDocumentation
*/
import {lstatSync, unlinkSync, rmSync, rmdirSync} from "node:fs"
import validation from "@zavx0z/ai-tech-input"
const {object, boolean} = validation
import type {Zavx0zAiWorkspace} from "@zavx0z/ai-workspace"

import type {Zavx0zAiFilesystemRemove} from "./contract/index.ts"
export type {Zavx0zAiFilesystemRemove} from "./contract/index.ts"

/**
Удаляет файл, саму конечную символическую ссылку либо каталог внутри рабочей области.

Корень области недоступен для удаления. Каталог удаляется только пустым, если `recursive` не включён; рекурсивное удаление не является обратимым. Перехода по конечной ссылке нет.

@param input - Относительный путь и необязательный флаг рекурсии; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительный путь удалённой записи и `removed: true`.

@throws Ошибка `INVALID_INPUT` при неверной форме, `ROOT_NOT_ALLOWED` при смене идентичности корня и `PATH_NOT_ALLOWED` для запрещённого адреса; отсутствие пути и непустой каталог дают системные ошибки файловой системы.
*/
export default function removePath(input: Zavx0zAiFilesystemRemove.Input, context: Zavx0zAiWorkspace.Output): Zavx0zAiFilesystemRemove.Output {
  object(input, ["path", "recursive"])
  const recursive = boolean(input.recursive, false, "recursive")
  context.directory()
  const path = context.resolve(input.path, {finalSymlink: true})
  const stat = lstatSync(path)
  if (stat.isDirectory()) {
    if (recursive) rmSync(path, {recursive: true, force: false})
    else rmdirSync(path)
  } else unlinkSync(path)
  return {path: context.relative(path), removed: true}
}
