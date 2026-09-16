import {test} from "node:test"
import assert from "node:assert/strict"
import {readFileSync, writeFileSync, mkdirSync, existsSync} from "node:fs"
import {join} from "node:path"
import {createDiscovery} from "../index.ts"
import {bindings} from "../../request/src/bindings.ts"
import {fixture, hasCode} from "../../../filesystem/shared/spec-fixture.ts"
import {repositoryRoot} from "../../request/spec/fixture.ts"

test("every executable binding has colocated contracts and a scenario", () => fixture(filesystem => {
  const handlers = bindings(filesystem)
  assert.equal(handlers.size, 13)
  for (const node of handlers.keys()) {
    const path = node.split("/").slice(1).join("/")
    for (const file of ["index.ts", "contract/input.ts", "contract/output.ts", "spec/scenario.spec.ts"]) {
      assert.equal(existsSync(join(repositoryRoot, path, file)), true, `${node}/${file}`)
    }
  }
  const discovery = createDiscovery({repositoryRoot, runnable: new Set(handlers.keys())})
  assert.equal(discovery.has("ai/filesystem/read"), true)
  assert.throws(() => discovery.describe("ai/filesystem/shared"), hasCode("UNKNOWN_NODE"))
}))
test("discovery supports nested structural addresses without executing source", () => fixture((_context, root) => {
  writeFileSync(join(root, "package.json"), JSON.stringify({name: "@test/ai", workspaces: ["filesystem"]}))
  mkdirSync(join(root, "filesystem/group/tool"), {recursive: true})
  writeFileSync(join(root, "filesystem/package.json"), JSON.stringify({name: "@test/filesystem", exports: {"./group/tool": "./group/tool/index.ts"}}))
  writeFileSync(join(root, "filesystem/group/tool/index.ts"), "/** Safe description. @packageDocumentation */\nthrow new Error('must not execute')\n")
  const discovery = createDiscovery({repositoryRoot: root, runnable: new Set(["ai/filesystem/group/tool"])})
  const category = discovery.describe("ai/filesystem/group") as {children: Array<{node: string}>}
  assert.equal(category.children[0]?.node, "ai/filesystem/group/tool")
  const tool = discovery.describe("ai/filesystem/group/tool") as {description: string; views: string[]}
  assert.equal(tool.description, "Safe description.")
  assert.deepEqual(tool.views, ["overview"])
}))
test("package manifests have no runtime dependency on UI, browser or Storybook", () => {
  for (const path of ["package.json", "filesystem/package.json", "git/package.json", "server/package.json"]) {
    const manifest = JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"))
    assert.equal(manifest.dependencies, undefined)
  }
})
