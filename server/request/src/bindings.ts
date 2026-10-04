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
  {name: "filesystem.stat", packageName: "@zavx0z/ai-filesystem-stat", execute: statPath},
  {name: "filesystem.read", packageName: "@zavx0z/ai-filesystem-read", execute: readFile},
  {name: "filesystem.read-many", packageName: "@zavx0z/ai-filesystem-read-many", execute: readFiles},
  {name: "filesystem.list", packageName: "@zavx0z/ai-filesystem-list", execute: listFiles},
  {name: "filesystem.write", packageName: "@zavx0z/ai-filesystem-write", execute: writeFile},
  {name: "filesystem.create", packageName: "@zavx0z/ai-filesystem-create", execute: createFile},
  {name: "filesystem.mkdir", packageName: "@zavx0z/ai-filesystem-mkdir", execute: makeDirectory},
  {name: "filesystem.remove", packageName: "@zavx0z/ai-filesystem-remove", execute: removePath},
  {name: "filesystem.rename", packageName: "@zavx0z/ai-filesystem-rename", execute: renamePath},
  {name: "filesystem.apply-patch", packageName: "@zavx0z/ai-filesystem-apply-patch", execute: applyPatch},
  {name: "git.status", packageName: "@zavx0z/ai-git-status", execute: gitStatus},
] as const

/**
Закрепляет все исполнения за одним контекстом хоста.

@param context - Область сессии, недоступная для выбора из команды модели.

@returns Карта исполняемых имён; имена не интерпретируются как пути или import.
*/
export function bindings(context: AiWorkspace.Output): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map(tools.map(tool => [tool.name, (input: unknown) => tool.execute(input as never, context)]))
}
