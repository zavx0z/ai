import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, mkdirSync, symlinkSync} from "node:fs"
import {join} from "node:path"
import {listFiles} from "../index.ts"
import {fixture} from "../../shared/spec-fixture.ts"

test("list omits Git metadata and does not traverse symlink directories", () => fixture((context, root) => {
  mkdirSync(join(root, ".git"))
  writeFileSync(join(root, ".git/config"), "private")
  mkdirSync(join(root, "dir"))
  writeFileSync(join(root, "dir/file"), "ok")
  symlinkSync("dir", join(root, "link"))
  const paths = listFiles({root: "repo", recursive: true}, context).entries.map(entry => entry.path)
  assert.ok(paths.includes("dir/file"))
  assert.ok(paths.includes("link"))
  assert.ok(!paths.some(path => path.includes(".git") || path.startsWith("link/")))
}))
test("list reports entry truncation", () => fixture((context, root) => {
  for (let i = 0; i < 5; i++) writeFileSync(join(root, `${i}`), "")
  const result = listFiles({root: "repo", maxEntries: 2}, context)
  assert.equal(result.entries.length, 2)
  assert.equal(result.truncated, true)
}))
test("list reports depth-limited inventories", () => fixture((context, root) => {
  mkdirSync(join(root, "a/b"), {recursive: true})
  writeFileSync(join(root, "a/b/file"), "")
  const result = listFiles({root: "repo", recursive: true, maxDepth: 1}, context)
  assert.equal(result.depthLimited, true)
  assert.equal(result.truncated, true)
}))
test("list reports an empty directory as complete", () => fixture(context => {
  const result = listFiles({root: "repo"}, context)
  assert.deepEqual(result.entries, [])
  assert.equal(result.truncated, false)
}))
