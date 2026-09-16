import {test} from "node:test"
import assert from "node:assert/strict"
import {existsSync} from "node:fs"
import {join} from "node:path"
import {makeDirectory} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("mkdir recursive mode reports creation and idempotent repetition", () => fixture((context, root) => {
  assert.equal(makeDirectory({root: "repo", path: "a/b", recursive: true}, context).created, true)
  assert.equal(makeDirectory({root: "repo", path: "a/b", recursive: true}, context).created, false)
  assert.equal(existsSync(join(root, "a/b")), true)
}))
test("mkdir refuses root and invalid recursive flag", () => fixture(context => {
  assert.throws(() => makeDirectory({root: "repo", path: "."}, context), hasCode("PATH_NOT_ALLOWED"))
  assert.throws(() => makeDirectory({root: "repo", path: "a", recursive: "true"} as never, context), hasCode("INVALID_INPUT"))
}))
