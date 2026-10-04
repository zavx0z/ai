/**
Строит ограниченный инвентарь каталога без обхода символических ссылок и `.git`.

@remarks Обход читает каталог постепенно. Состав выборки, усечённой по количеству записей, зависит от порядка файловой системы.

@packageDocumentation
*/
import {opendirSync, lstatSync} from "node:fs"
import {join} from "node:path"
import validation from "@zavx0z/ai-tech-input"
const {object, integer, boolean} = validation
import ToolError from "@zavx0z/ai-tech-failure"
import access from "@zavx0z/ai-filesystem-access"
const {metadata} = access
import type {Zavx0zAiWorkspace} from "@zavx0z/ai-workspace"

import type {Zavx0zAiFilesystemList} from "./contract/index.ts"
export type {Zavx0zAiFilesystemList} from "./contract/index.ts"

/**
Перечисляет записи каталога и при включённой рекурсии спускается только в реальные каталоги.

По умолчанию используется корень области, без рекурсии, с глубиной `3` и пределом `1000` записей. `maxDepth` ограничен `[1..10]`, `maxEntries` — `[1..5000]`; `.git` пропускается, конечные ссылки описываются как записи, но не обходятся. Порядок сортируется по пути после обхода.

@param input - Путь к каталогу и параметры обхода; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns Относительные метаданные найденных записей и флаги усечения по числу записей или глубине.

@throws Ошибка `INVALID_INPUT` для неверных параметров, `ROOT_NOT_ALLOWED` если назначенный корень сменил идентичность, `INVALID_PATH_TYPE` если цель не каталог, а также ошибки разрешения пути и доступа к каталогу.
*/
export default function listFiles(input: Zavx0zAiFilesystemList.Input, context: Zavx0zAiWorkspace.Output): Zavx0zAiFilesystemList.Output {
  object(input, ["path", "recursive", "maxDepth", "maxEntries"])
  const root = context.directory()
  const start = context.resolve(input.path ?? ".", {allowRoot: true})
  const recursive = boolean(input.recursive, false, "recursive")
  const maxDepth = integer(input.maxDepth, 3, 1, 10, "maxDepth")
  const maxEntries = integer(input.maxEntries, 1000, 1, 5000, "maxEntries")
  if (!lstatSync(start).isDirectory()) throw new ToolError("INVALID_PATH_TYPE", "Path must be a directory")
  const entries: Zavx0zAiFilesystemList.Output["entries"] = []
  let truncated = false
  let depthLimited = false
  /**
  Читает каталог, добавляет его записи и рекурсивно обходит дочерние каталоги по глубине.

  Дескриптор каталога закрывается в `finally` также при ошибке чтения или вложенного обхода.

  @param directory - Абсолютный путь каталога внутри уже проверенной рабочей области.

  @param depth - Уровень каталога: стартовый каталог имеет глубину `1`.
  */
  const visit = (directory: string, depth: number): void => {
    const handle = opendirSync(directory)
    try {
      let child
      while ((child = handle.readSync()) !== null) {
        if (child.name.toLowerCase() === ".git") continue
        if (entries.length === maxEntries) {
          truncated = true
          return
        }
        const path = join(directory, child.name)
        const entry = metadata(root, path)
        entries.push(entry)
        if (recursive && entry.type === "directory") {
          if (depth < maxDepth) visit(path, depth + 1)
          else depthLimited = true
          if (truncated) return
        }
      }
    } finally { handle.closeSync() }
  }
  visit(start, 1)
  entries.sort((a, b) => a.path.localeCompare(b.path))
  return {path: context.relative(start), entries, truncated: truncated || depthLimited, depthLimited}
}
