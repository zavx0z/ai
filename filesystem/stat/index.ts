/**
Возвращает метаданные пути, не разыменовывая конечную символическую ссылку.

@remarks Чтение идемпотентно при неизменной записи. Для конечной ссылки возвращаются метаданные ссылки.

@packageDocumentation
*/
import validation from "@zavx0z/ai-tech-input"
const {object} = validation
import access from "@zavx0z/ai-filesystem-access"
const {metadata} = access
import type {AiWorkspace} from "@zavx0z/ai-workspace"

import type {AiFilesystemStat} from "./contract/index.ts"
export type {AiFilesystemStat} from "./contract/index.ts"

/**
Возвращает `lstat`-метаданные записи внутри назначенной рабочей области.

Разрешает сам корень и конечную символическую ссылку, но не следует по ссылке; результат описывает саму запись, а не цель ссылки.

@param input - Относительный путь; допускается `.` для самой области. Другие поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Путь, тип записи, размер, права доступа и время изменения.

@throws Ошибка `INVALID_INPUT` для неверной формы входа, `ROOT_NOT_ALLOWED` если назначенный корень сменил идентичность, `PATH_NOT_ALLOWED` для запрещённого пути; отсутствие и недоступность пути дают ошибки файловой системы.
*/
export default function statPath(input: AiFilesystemStat.Input, context: AiWorkspace.Output): AiFilesystemStat.Output {
  object(input, ["path"])
  const root = context.directory()
  const path = context.resolve(input.path, {allowRoot: true, finalSymlink: true})
  return {entry: metadata(root, path)}
}
