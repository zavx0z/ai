import statDescription from "@zavx0z/ai-filesystem-stat/description.json" with {type: "json"}
import readDescription from "@zavx0z/ai-filesystem-read/description.json" with {type: "json"}
import readManyDescription from "@zavx0z/ai-filesystem-read-many/description.json" with {type: "json"}
import listDescription from "@zavx0z/ai-filesystem-list/description.json" with {type: "json"}
import writeDescription from "@zavx0z/ai-filesystem-write/description.json" with {type: "json"}
import createDescription from "@zavx0z/ai-filesystem-create/description.json" with {type: "json"}
import mkdirDescription from "@zavx0z/ai-filesystem-mkdir/description.json" with {type: "json"}
import removeDescription from "@zavx0z/ai-filesystem-remove/description.json" with {type: "json"}
import renameDescription from "@zavx0z/ai-filesystem-rename/description.json" with {type: "json"}
import patchDescription from "@zavx0z/ai-filesystem-apply-patch/description.json" with {type: "json"}
import gitDescription from "@zavx0z/ai-git-status/description.json" with {type: "json"}
import statPath from "@zavx0z/ai-filesystem-stat"
import readFile from "@zavx0z/ai-filesystem-read"
import readFiles from "@zavx0z/ai-filesystem-read-many"
import listFiles from "@zavx0z/ai-filesystem-list"
import writeFile from "@zavx0z/ai-filesystem-write"
import createFile from "@zavx0z/ai-filesystem-create"
import makeDirectory from "@zavx0z/ai-filesystem-mkdir"
import removePath from "@zavx0z/ai-filesystem-remove"
import renamePath from "@zavx0z/ai-filesystem-rename"
import applyPatch from "@zavx0z/ai-filesystem-apply-patch"
import gitStatus from "@zavx0z/ai-git-status"
import type {AiWorkspace} from "@zavx0z/ai-workspace"

/** Явно подключённые инструменты; packageName нужен только генератору описаний. */
export const tools = [
  {name: "filesystem.stat", description: statDescription, packageName: "@zavx0z/ai-filesystem-stat", execute: statPath},
  {name: "filesystem.read", description: readDescription, packageName: "@zavx0z/ai-filesystem-read", execute: readFile},
  {name: "filesystem.read-many", description: readManyDescription, packageName: "@zavx0z/ai-filesystem-read-many", execute: readFiles},
  {name: "filesystem.list", description: listDescription, packageName: "@zavx0z/ai-filesystem-list", execute: listFiles},
  {name: "filesystem.write", description: writeDescription, packageName: "@zavx0z/ai-filesystem-write", execute: writeFile},
  {name: "filesystem.create", description: createDescription, packageName: "@zavx0z/ai-filesystem-create", execute: createFile},
  {name: "filesystem.mkdir", description: mkdirDescription, packageName: "@zavx0z/ai-filesystem-mkdir", execute: makeDirectory},
  {name: "filesystem.remove", description: removeDescription, packageName: "@zavx0z/ai-filesystem-remove", execute: removePath},
  {name: "filesystem.rename", description: renameDescription, packageName: "@zavx0z/ai-filesystem-rename", execute: renamePath},
  {name: "filesystem.apply-patch", description: patchDescription, packageName: "@zavx0z/ai-filesystem-apply-patch", execute: applyPatch},
  {name: "git.status", description: gitDescription, packageName: "@zavx0z/ai-git-status", execute: gitStatus},
] as const

/**
Закрепляет все исполнения за одним контекстом хоста.

@param context - Область сессии, недоступная для выбора из команды модели.

@returns Карта исполняемых имён; имена не интерпретируются как пути или import.
*/
export function bindings(context: AiWorkspace.Output): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map(tools.map(tool => [tool.name, (input: unknown) => tool.execute(input as never, context)]))
}
