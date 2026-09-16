import {listRoots} from "../../../filesystem/roots/index.ts"
import {openWorkspace} from "../../../filesystem/open/index.ts"
import {statPath} from "../../../filesystem/stat/index.ts"
import {readFile} from "../../../filesystem/read/index.ts"
import {readFiles} from "../../../filesystem/read-many/index.ts"
import {listFiles} from "../../../filesystem/list/index.ts"
import {writeFile} from "../../../filesystem/write/index.ts"
import {createFile} from "../../../filesystem/create/index.ts"
import {makeDirectory} from "../../../filesystem/mkdir/index.ts"
import {removePath} from "../../../filesystem/remove/index.ts"
import {renamePath} from "../../../filesystem/rename/index.ts"
import {applyPatch} from "../../../filesystem/apply-patch/index.ts"
import {gitStatus} from "../../../git/status/index.ts"
import type {FilesystemOutput} from "../../../filesystem/contract/output.ts"

export function bindings(context: FilesystemOutput): ReadonlyMap<string, (input: unknown) => unknown> {
  return new Map<string, (input: unknown) => unknown>([
    ["ai/filesystem/roots", value => listRoots(value as Parameters<typeof listRoots>[0], context)],
    ["ai/filesystem/open", value => openWorkspace(value as Parameters<typeof openWorkspace>[0], context)],
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
