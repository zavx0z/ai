import statPath from "@filesystem/stat"
import readFile from "@filesystem/read"
import readFiles from "@filesystem/read-many"
import listFiles from "@filesystem/list"
import writeFile from "@filesystem/write"
import createFile from "@filesystem/create"
import makeDirectory from "@filesystem/mkdir"
import removePath from "@filesystem/remove"
import renamePath from "@filesystem/rename"
import applyPatch from "@filesystem/apply-patch"
import gitStatus from "@git/status"
import type {AiWorkspace} from "@ai/workspace"

/** Явно подключённые инструменты; packageName нужен только генератору описаний. */
export const tools = [
  {name: "filesystem.stat", packageName: "@filesystem/stat", execute: statPath},
  {name: "filesystem.read", packageName: "@filesystem/read", execute: readFile},
  {name: "filesystem.read-many", packageName: "@filesystem/read-many", execute: readFiles},
  {name: "filesystem.list", packageName: "@filesystem/list", execute: listFiles},
  {name: "filesystem.write", packageName: "@filesystem/write", execute: writeFile},
  {name: "filesystem.create", packageName: "@filesystem/create", execute: createFile},
  {name: "filesystem.mkdir", packageName: "@filesystem/mkdir", execute: makeDirectory},
  {name: "filesystem.remove", packageName: "@filesystem/remove", execute: removePath},
  {name: "filesystem.rename", packageName: "@filesystem/rename", execute: renamePath},
  {name: "filesystem.apply-patch", packageName: "@filesystem/apply-patch", execute: applyPatch},
  {name: "git.status", packageName: "@git/status", execute: gitStatus},
] as const

/**
Закрепляет все исполнения за одним контекстом хоста.

@param context - Область сессии, недоступная для выбора из команды модели.

@returns Карта исполняемых имён; имена не интерпретируются как пути или import.
*/
export function bindings(context: AiWorkspace.Output): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map(tools.map(tool => [tool.name, (input: unknown) => tool.execute(input as never, context)]))
}
