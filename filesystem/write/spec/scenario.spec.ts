import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, readFileSync, symlinkSync, chmodSync, statSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {writeFile} from "../index.ts"
import {readFile} from "../../read/index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("write replaces a file and preserves its permissions", () => fixture((context, root) => {
  const path = join(root, "file")
  writeFileSync(path, "before")
  chmodSync(path, 0o660)
  const result = writeFile({root: "repo", path: "file", content: "after"}, context)
  assert.equal(readFileSync(path, "utf8"), "after")
  assert.equal(result.bytes, 5)
  assert.equal(statSync(path).mode & 0o777, 0o660)
  assert.deepEqual(readdirSync(root), ["file"])
}))
test("write rejects a stale expectedHash without changing contents", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "before")
  const hash = readFile({root: "repo", path: "file"}, context).contentHash!
  writeFile({root: "repo", path: "file", content: "after", expectedHash: hash}, context)
  assert.throws(() => writeFile({root: "repo", path: "file", content: "bad", expectedHash: hash}, context), hasCode("CONFLICT"))
  assert.equal(readFileSync(join(root, "file"), "utf8"), "after")
}))
test("write accepts empty contents but does not create missing files", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "before")
  writeFile({root: "repo", path: "file", content: ""}, context)
  assert.equal(statSync(join(root, "file")).size, 0)
  assert.throws(() => writeFile({root: "repo", path: "missing", content: ""}, context), hasCode("ENOENT"))
}))
test("write rejects symlinks and non-canonical base64", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "before")
  symlinkSync("file", join(root, "link"))
  assert.throws(() => writeFile({root: "repo", path: "link", content: "bad"}, context), hasCode("PATH_NOT_ALLOWED"))
  for (const content of ["abc", "!!!!", "Zh=="]) {
    assert.throws(() => writeFile({root: "repo", path: "file", content, encoding: "base64"}, context), hasCode("INVALID_INPUT"))
  }
  assert.equal(readFileSync(join(root, "file"), "utf8"), "before")
}))
