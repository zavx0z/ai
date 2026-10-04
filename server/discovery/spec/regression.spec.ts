import {test} from "bun:test"
import assert from "node:assert/strict"
import {readFileSync, writeFileSync, mkdirSync, existsSync} from "node:fs"
import {join} from "node:path"
import createDiscovery from "@server/discovery"
import testing from "@ai/testing"
const {fixture, hasCode} = testing


test("discovery supports nested structural addresses without executing source", () => fixture((_context, root) => {
  writeFileSync(join(root, "package.json"), JSON.stringify({name: "@test/ai", workspaces: ["filesystem/*/*"]}))
  mkdirSync(join(root, "filesystem/group/tool"), {recursive: true})
  writeFileSync(join(root, "filesystem/group/tool/package.json"), JSON.stringify({name: "@test/filesystem", exports: {".": "./index.ts"}}))
  writeFileSync(join(root, "filesystem/group/tool/index.ts"), "/** Safe description. @packageDocumentation */\nthrow new Error('must not execute')\n")
  const discovery = createDiscovery({repositoryRoot: root, runnable: new Set(["ai/filesystem/group/tool"])})
  const category = discovery.describe("ai/filesystem/group") as {children: Array<{node: string}>}
  assert.equal(category.children[0]?.node, "ai/filesystem/group/tool")
  const tool = discovery.describe("ai/filesystem/group/tool") as {description: string; views: string[]}
  assert.equal(tool.description, "Safe description.")
  assert.deepEqual(tool.views, ["overview"])
}))
