/**
Создаёт каталог внутри назначенной рабочей области.

@remarks При `recursive: true` повтор для существующего каталога успешен и возвращает `created: false`. Сам корень изменять нельзя.

@packageDocumentation
*/
import {mkdirSync, lstatSync} from "node:fs"
import validation from "@ai-tech/input"
const {object, boolean} = validation
import type {AiWorkspace} from "@ai/workspace"

import type {AiFilesystemMkdir} from "./contract/index.ts"
export type {AiFilesystemMkdir} from "./contract/index.ts"

/**
Создаёт каталог по относительному пути внутри назначенной области.

Без `recursive` отсутствующие промежуточные каталоги не создаются; при `recursive: true` они создаются вместе с целевым. Флаг `created` отражает, существовал ли целевой каталог до вызова.

@param input - Путь и необязательный режим рекурсивного создания; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительный путь и признак того, что целевой каталог был создан этим вызовом.

@throws Ошибка `INVALID_INPUT` при неверной форме, `ROOT_NOT_ALLOWED` при смене идентичности корня, ошибка разрешения пути для запрещённого или неподходящего адреса, а также ошибки файловой системы.
*/
export default function makeDirectory(input: AiFilesystemMkdir.Input, context: AiWorkspace.Output): AiFilesystemMkdir.Output {
  object(input, ["path", "recursive"])
  const recursive = boolean(input.recursive, false, "recursive")
  context.directory()
  const path = context.resolve(input.path, {missing: true})
  let existed = false
  try { existed = lstatSync(path).isDirectory() } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  mkdirSync(path, {recursive})
  return {path: context.relative(path), created: !existed}
}
