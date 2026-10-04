import {test} from "bun:test"
import assert from "node:assert/strict"
import {existsSync} from "node:fs"
import {join} from "node:path"
import createDiscovery from "@server/discovery"
import {bindings} from "../src/bindings.ts"
import testing from "@ai/testing"
import {repositoryRoot} from "../spec/fixture.ts"
const {fixture, hasCode} = testing

test("every executable binding has colocated contracts and a scenario", () => fixture(filesystem => {
  const handlers = bindings(filesystem)
  assert.equal(handlers.size, 11)
  for (const node of handlers.keys()) {
    const path = node.split("/").slice(1).join("/")
    for (const file of ["index.ts", "contract/index.ts", "spec/scenario.spec.ts"]) {
      assert.equal(existsSync(join(repositoryRoot, path, file)), true, `${node}/${file}`)
    }
  }
  const discovery = createDiscovery({repositoryRoot, runnable: new Set(handlers.keys())})
  assert.equal(discovery.has("ai/filesystem/read"), true)
  assert.throws(() => discovery.describe("ai/filesystem/shared"), hasCode("UNKNOWN_NODE"))
}))
