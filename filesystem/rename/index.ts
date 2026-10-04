/**
Перемещает путь внутри одного корня, не перезаписывая существующую цель.

@remarks Повтор не идемпотентен. Проверка цели не является межпроцессной блокировкой; каталоги должны оставаться доверенными.

@packageDocumentation
*/
import {lstatSync, renameSync} from "node:fs"
import {relative, sep} from "node:path"
import validation from "@zavx0z/ai-tech-input"
const {object} = validation
import ToolError from "@zavx0z/ai-tech-failure"
import type {AiWorkspace} from "@zavx0z/ai-workspace"

import type {AiFilesystemRename} from "./contract/index.ts"
export type {AiFilesystemRename} from "./contract/index.ts"

/**
Перемещает запись по двум относительным путям внутри одной назначенной области.

Цель проверяется перед переименованием и при наличии вызывает `CONFLICT`. Каталог нельзя переместить внутрь самого себя. Проверка и системный вызов не образуют блокировку от параллельного локального процесса; каталоги должны оставаться доверенными.

@param input - Исходный путь `from` и назначение `to`; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительные исходный и целевой пути после успешного перемещения.

@throws Ошибка `INVALID_INPUT` для неверной формы или попытки переместить каталог внутрь себя, `ROOT_NOT_ALLOWED` при смене идентичности корня, `CONFLICT` для существующего назначения, а также ошибки разрешения пути и файловой системы.
*/
export default function renamePath(input: AiFilesystemRename.Input, context: AiWorkspace.Output): AiFilesystemRename.Output {
  object(input, ["from", "to"])
  context.directory()
  const from = context.resolve(input.from)
  const to = context.resolve(input.to, {missing: true})
  try {
    lstatSync(to)
    throw new ToolError("CONFLICT", "Destination already exists", 409)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  const inside = relative(from, to)
  if (lstatSync(from).isDirectory() && inside !== ".." && !inside.startsWith(`..${sep}`)) {
    throw new ToolError("INVALID_INPUT", "A directory cannot be moved into itself")
  }
  renameSync(from, to)
  return {from: context.relative(from), to: context.relative(to), renamed: true}
}
