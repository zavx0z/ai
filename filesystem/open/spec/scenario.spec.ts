import {test} from "node:test"
import assert from "node:assert/strict"
import {openWorkspace} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("open validates a registered non-Git directory", () => fixture(context => {
  assert.deepEqual(openWorkspace({root: "repo"}, context), {root: "repo", path: "."})
}))
test("open cannot grant access to an arbitrary path or inherited property", () => fixture(context => {
  for (const root of ["/tmp", "..", "constructor", "toString"]) {
    assert.throws(() => openWorkspace({root}, context), hasCode("ROOT_NOT_ALLOWED"))
  }
}))
