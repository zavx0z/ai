import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, symlinkSync} from "node:fs"
import {join} from "node:path"
import {statPath} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("stat returns file metadata and root metadata", () => fixture((context, root) => {
  writeFileSync(join(root, "file.txt"), "abc")
  assert.equal(statPath({root: "repo", path: "file.txt"}, context).entry.size, 3)
  assert.equal(statPath({root: "repo", path: "."}, context).entry.type, "directory")
}))
test("stat identifies but does not resolve a terminal symlink", () => fixture((context, root) => {
  symlinkSync("/no-such-outside-target", join(root, "link"))
  const result = statPath({root: "repo", path: "link"}, context)
  assert.equal(result.entry.type, "symlink")
  assert.equal(JSON.stringify(result).includes("outside-target"), false)
}))
test("stat does not expose nested Git metadata", () => fixture(context => {
  assert.throws(() => statPath({root: "repo", path: "nested/.git/config"}, context), hasCode("PATH_NOT_ALLOWED"))
}))
