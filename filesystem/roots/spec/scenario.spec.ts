import {test} from "node:test"
import assert from "node:assert/strict"
import {listRoots} from "../index.ts"
import {createFilesystem} from "../../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("roots discloses aliases, not server paths", () => fixture(context => {
  assert.deepEqual(listRoots({}, context), {roots: [{root: "repo"}]})
}))
test("host rejects implicit or empty root configuration", () => {
  assert.throws(() => createFilesystem({roots: {}}), hasCode("INVALID_INPUT"))
  assert.throws(() => createFilesystem({roots: {repo: "."}}), hasCode("INVALID_INPUT"))
})
test("roots rejects unexpected fields", () => fixture(context => {
  assert.throws(() => listRoots({path: "/"} as never, context), hasCode("INVALID_INPUT"))
}))
