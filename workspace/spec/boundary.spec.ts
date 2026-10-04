import {test, expect} from "bun:test"
import {mkdirSync, renameSync, existsSync} from "node:fs"
import {join} from "node:path"
import createWorkspace from "@ai/workspace"
import type {AiWorkspace} from "@ai/workspace"
import createFile from "@filesystem/create"
import writeFile from "@filesystem/write"
import makeDirectory from "@filesystem/mkdir"
import removePath from "@filesystem/remove"
import renamePath from "@filesystem/rename"
import applyPatch from "@filesystem/apply-patch"
import testing from "@ai/testing"
import assert from "node:assert/strict"

test.each([
  {name: "create", run: (context: AiWorkspace.Output) => createFile({path: ".", content: "x"}, context)},
  {name: "write", run: (context: AiWorkspace.Output) => writeFile({path: ".", content: "x"}, context)},
  {name: "mkdir", run: (context: AiWorkspace.Output) => makeDirectory({path: ".", recursive: true}, context)},
  {name: "remove", run: (context: AiWorkspace.Output) => removePath({path: ".", recursive: true}, context)},
  {name: "rename source", run: (context: AiWorkspace.Output) => renamePath({from: ".", to: "moved"}, context)},
  {name: "rename destination", run: (context: AiWorkspace.Output) => renamePath({from: "child", to: "."}, context)},
  {name: "patch", run: (context: AiWorkspace.Output) => applyPatch({patch: "*** Begin Patch\n*** Delete File: .\n*** End Patch"}, context)},
])("$name не изменяет саму назначенную область", ({run}) => testing.fixture((context, directory) => {
  mkdirSync(join(directory, "child"))
  assert.throws(() => run(context), testing.hasCode("PATH_NOT_ALLOWED"))
  expect(existsSync(join(directory, "child")), "Отказ сохраняет область и её содержимое").toBe(true)
}))

test("Замена реальной директории новой с тем же путём не переназначает контекст", () => testing.fixture((_context, directory) => {
  const assigned = join(directory, "assigned")
  mkdirSync(assigned)
  const context = createWorkspace({directory: assigned})
  renameSync(assigned, join(directory, "previous"))
  mkdirSync(assigned)
  assert.throws(() => context.resolve("file", {missing: true}), testing.hasCode("ROOT_NOT_ALLOWED"))
}))
