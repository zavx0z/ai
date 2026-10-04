import statPath from "@ai-filesystem/stat"
import readFile from "@ai-filesystem/read"
import readFiles from "@ai-filesystem/read-many"
import listFiles from "@ai-filesystem/list"
import writeFile from "@ai-filesystem/write"
import createFile from "@ai-filesystem/create"
import makeDirectory from "@ai-filesystem/mkdir"
import removePath from "@ai-filesystem/remove"
import renamePath from "@ai-filesystem/rename"
import applyPatch from "@ai-filesystem/apply-patch"
import gitStatus from "@ai-git/status"
import type {AiWorkspace} from "@ai/workspace"

/** Явно подключённые инструменты; packageName нужен только генератору описаний. */
export const tools = [
  {name: "filesystem.stat", packageName: "@ai-filesystem/stat", execute: statPath},
  {name: "filesystem.read", packageName: "@ai-filesystem/read", execute: readFile},
  {name: "filesystem.read-many", packageName: "@ai-filesystem/read-many", execute: readFiles},
  {name: "filesystem.list", packageName: "@ai-filesystem/list", execute: listFiles},
  {name: "filesystem.write", packageName: "@ai-filesystem/write", execute: writeFile},
  {name: "filesystem.create", packageName: "@ai-filesystem/create", execute: createFile},
  {name: "filesystem.mkdir", packageName: "@ai-filesystem/mkdir", execute: makeDirectory},
  {name: "filesystem.remove", packageName: "@ai-filesystem/remove", execute: removePath},
  {name: "filesystem.rename", packageName: "@ai-filesystem/rename", execute: renamePath},
  {name: "filesystem.apply-patch", packageName: "@ai-filesystem/apply-patch", execute: applyPatch},
  {name: "git.status", packageName: "@ai-git/status", execute: gitStatus},
] as const

/**
Закрепляет все исполнения за одним контекстом хоста.

@param context - Область сессии, недоступная для выбора из команды модели.

@returns Карта исполняемых имён; имена не интерпретируются как пути или import.
*/
export function bindings(context: AiWorkspace.Output): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map(tools.map(tool => [tool.name, (input: unknown) => tool.execute(input as never, context)]))
}
