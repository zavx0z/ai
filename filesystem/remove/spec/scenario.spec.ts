import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, mkdirSync, symlinkSync, existsSync} from "node:fs"
import {join} from "node:path"
import {removePath} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("remove requires explicit recursion for a nonempty directory", () => fixture((context, root) => {
  mkdirSync(join(root, "dir"))
  writeFileSync(join(root, "dir/file"), "x")
  assert.throws(() => removePath({root: "repo", path: "dir"}, context))
  assert.equal(existsSync(join(root, "dir/file")), true)
  removePath({root: "repo", path: "dir", recursive: true}, context)
  assert.equal(existsSync(join(root, "dir")), false)
}))
test("remove unlinks a terminal symlink without deleting its target", () => fixture((context, root) => {
  writeFileSync(join(root, "target"), "x")
  symlinkSync("target", join(root, "link"))
  removePath({root: "repo", path: "link"}, context)
  assert.equal(existsSync(join(root, "target")), true)
}))
test("remove protects the root and reports a repeated deletion", () => fixture((context, root) => {
  assert.throws(() => removePath({root: "repo", path: ".", recursive: true}, context), hasCode("PATH_NOT_ALLOWED"))
  writeFileSync(join(root, "file"), "x")
  removePath({root: "repo", path: "file"}, context)
  assert.throws(() => removePath({root: "repo", path: "file"}, context), hasCode("ENOENT"))
}))
