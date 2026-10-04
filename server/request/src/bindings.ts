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

export function bindings(context: AiWorkspace.Output): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map<string, (input: unknown) => unknown>([
    ["ai/filesystem/stat", value => statPath(value as Parameters<typeof statPath>[0], context)],
    ["ai/filesystem/read", value => readFile(value as Parameters<typeof readFile>[0], context)],
    ["ai/filesystem/read-many", value => readFiles(value as Parameters<typeof readFiles>[0], context)],
    ["ai/filesystem/list", value => listFiles(value as Parameters<typeof listFiles>[0], context)],
    ["ai/filesystem/write", value => writeFile(value as Parameters<typeof writeFile>[0], context)],
    ["ai/filesystem/create", value => createFile(value as Parameters<typeof createFile>[0], context)],
    ["ai/filesystem/mkdir", value => makeDirectory(value as Parameters<typeof makeDirectory>[0], context)],
    ["ai/filesystem/remove", value => removePath(value as Parameters<typeof removePath>[0], context)],
    ["ai/filesystem/rename", value => renamePath(value as Parameters<typeof renamePath>[0], context)],
    ["ai/filesystem/apply-patch", value => applyPatch(value as Parameters<typeof applyPatch>[0], context)],
    ["ai/git/status", value => gitStatus(value as Parameters<typeof gitStatus>[0], context)],
  ])
}
