import {test} from "node:test"
import assert from "node:assert/strict"
import {readFileSync, existsSync, symlinkSync} from "node:fs"
import {join} from "node:path"
import {createFile} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("create writes a new file and rejects a duplicate", () => fixture((context, root) => {
  createFile({root: "repo", path: "file", content: "hello"}, context)
  assert.throws(() => createFile({root: "repo", path: "file", content: "bad"}, context), hasCode("EEXIST"))
  assert.equal(readFileSync(join(root, "file"), "utf8"), "hello")
}))
test("create requires explicit parent creation", () => fixture((context, root) => {
  assert.throws(() => createFile({root: "repo", path: "a/file", content: ""}, context), hasCode("ENOENT"))
  assert.equal(existsSync(join(root, "a")), false)
  createFile({root: "repo", path: "a/file", content: "", createParents: true}, context)
  assert.equal(existsSync(join(root, "a/file")), true)
}))
test("create validates input before creating parents", () => fixture((context, root) => {
  assert.throws(() => createFile({root: "repo", path: "a/file", content: "!", encoding: "base64", createParents: true}, context), hasCode("INVALID_INPUT"))
  assert.equal(existsSync(join(root, "a")), false)
}))
test("create rejects a dangling symlink destination", () => fixture((context, root) => {
  symlinkSync("missing", join(root, "link"))
  assert.throws(() => createFile({root: "repo", path: "link", content: "x"}, context), hasCode("PATH_NOT_ALLOWED"))
}))
