import {test, expect} from "bun:test"
import {mkdirSync, renameSync, existsSync} from "node:fs"
import {join} from "node:path"
import createWorkspace from "@zavx0z/ai-workspace"
import type {Zavx0zAiWorkspace} from "@zavx0z/ai-workspace"
import createFile from "@zavx0z/ai-filesystem-create"
import writeFile from "@zavx0z/ai-filesystem-write"
import makeDirectory from "@zavx0z/ai-filesystem-mkdir"
import removePath from "@zavx0z/ai-filesystem-remove"
import renamePath from "@zavx0z/ai-filesystem-rename"
import applyPatch from "@zavx0z/ai-filesystem-apply-patch"
import testing from "@zavx0z/ai-testing"
import assert from "node:assert/strict"

test.each([
  {name: "create", run: (context: Zavx0zAiWorkspace.Output) => createFile({path: ".", content: "x"}, context)},
  {name: "write", run: (context: Zavx0zAiWorkspace.Output) => writeFile({path: ".", content: "x"}, context)},
  {name: "mkdir", run: (context: Zavx0zAiWorkspace.Output) => makeDirectory({path: ".", recursive: true}, context)},
  {name: "remove", run: (context: Zavx0zAiWorkspace.Output) => removePath({path: ".", recursive: true}, context)},
  {name: "rename source", run: (context: Zavx0zAiWorkspace.Output) => renamePath({from: ".", to: "moved"}, context)},
  {name: "rename destination", run: (context: Zavx0zAiWorkspace.Output) => renamePath({from: "child", to: "."}, context)},
  {name: "patch", run: (context: Zavx0zAiWorkspace.Output) => applyPatch({patch: "*** Begin Patch\n*** Delete File: .\n*** End Patch"}, context)},
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
