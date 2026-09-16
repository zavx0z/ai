import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, symlinkSync, mkdirSync} from "node:fs"
import {join} from "node:path"
import {readFile} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("read reports a complete file and its hash", () => fixture((context, root) => {
  writeFileSync(join(root, "hello.txt"), "hello")
  const result = readFile({root: "repo", path: "hello.txt"}, context)
  assert.equal(result.content, "hello")
  assert.equal(result.bytesRead, 5)
  assert.equal(result.truncated, false)
  assert.match(result.contentHash!, /^[a-f0-9]{64}$/)
}))
test("read reports byte-range truncation and no whole-file hash", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "abcdef")
  const result = readFile({root: "repo", path: "file", offset: 1, maxBytes: 2}, context)
  assert.equal(result.content, "bc")
  assert.equal(result.bytesRead, 2)
  assert.equal(result.contentHash, null)
  assert.equal(result.truncated, true)
}))
test("read handles empty files and offsets beyond EOF", () => fixture((context, root) => {
  writeFileSync(join(root, "empty"), "")
  assert.equal(readFile({root: "repo", path: "empty"}, context).bytesRead, 0)
  const result = readFile({root: "repo", path: "empty", offset: 100}, context)
  assert.equal(result.truncated, false)
  assert.equal(result.contentHash, null)
}))
test("read base64 preserves binary and split UTF-8 bytes", () => fixture((context, root) => {
  const bytes = Buffer.from([0, 255, 1, 128])
  writeFileSync(join(root, "binary"), bytes)
  const result = readFile({root: "repo", path: "binary", encoding: "base64", offset: 1, maxBytes: 2}, context)
  assert.deepEqual(Buffer.from(result.content, "base64"), bytes.subarray(1, 3))
}))
for (const path of ["../secret", "/etc/passwd", "nested/../../x", "a/../x", ".git/config", "nested/.GIT/config", "C:/secret", "..\\secret", "bad\0name"]) {
  test(`read rejects path ${JSON.stringify(path)}`, () => fixture(context => {
    assert.throws(() => readFile({root: "repo", path}, context), hasCode("PATH_NOT_ALLOWED"))
  }))
}
test("read rejects final and parent symlink traversal", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "secret")
  mkdirSync(join(root, "dir"))
  symlinkSync("file", join(root, "link"))
  symlinkSync("dir", join(root, "parent"))
  assert.throws(() => readFile({root: "repo", path: "link"}, context), hasCode("PATH_NOT_ALLOWED"))
  assert.throws(() => readFile({root: "repo", path: "parent/missing"}, context), hasCode("PATH_NOT_ALLOWED"))
}))
test("read validates numbers, encoding, input shape and target type", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "data")
  mkdirSync(join(root, "dir"))
  for (const extra of [{maxBytes: 0}, {maxBytes: 8388609}, {offset: -1}, {offset: 1.5}, {encoding: "latin1"}]) {
    assert.throws(() => readFile({root: "repo", path: "file", ...extra} as never, context), hasCode("INVALID_INPUT"))
  }
  assert.throws(() => readFile(null as never, context), hasCode("INVALID_INPUT"))
  assert.throws(() => readFile({root: "repo", path: "dir"}, context), hasCode("INVALID_PATH_TYPE"))
}))
