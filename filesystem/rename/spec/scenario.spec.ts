import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, readFileSync, mkdirSync, existsSync} from "node:fs"
import {join} from "node:path"
import {renamePath} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("rename moves a file to a new path", () => fixture((context, root) => {
  writeFileSync(join(root, "from"), "data")
  renamePath({root: "repo", from: "from", to: "to"}, context)
  assert.equal(existsSync(join(root, "from")), false)
  assert.equal(readFileSync(join(root, "to"), "utf8"), "data")
}))
test("rename does not overwrite an existing target", () => fixture((context, root) => {
  writeFileSync(join(root, "a"), "a")
  writeFileSync(join(root, "b"), "b")
  assert.throws(() => renamePath({root: "repo", from: "a", to: "b"}, context), hasCode("CONFLICT"))
  assert.equal(readFileSync(join(root, "b"), "utf8"), "b")
}))
test("rename rejects root and moving a directory into itself", () => fixture((context, root) => {
  mkdirSync(join(root, "dir"))
  assert.throws(() => renamePath({root: "repo", from: ".", to: "root"}, context), hasCode("PATH_NOT_ALLOWED"))
  assert.throws(() => renamePath({root: "repo", from: "dir", to: "dir/nested"}, context), hasCode("INVALID_INPUT"))
}))
