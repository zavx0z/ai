import {test} from "node:test"
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {writeFileSync, mkdirSync} from "node:fs"
import {join} from "node:path"
import {gitStatus} from "../index.ts"
import {createFilesystem} from "../../../filesystem/index.ts"
import {fixture, hasCode} from "../../../filesystem/shared/spec-fixture.ts"

test("status reads untracked names without shell parsing", () => fixture((context, root) => {
  assert.equal(spawnSync("git", ["init", "-q"], {cwd: root}).status, 0)
  writeFileSync(join(root, "unusual name\n.txt"), "data")
  const result = gitStatus({root: "repo"}, context)
  assert.equal(result.entries[0]?.path, "unusual name\n.txt")
  assert.equal(result.entries[0]?.index, "?")
  assert.equal(result.truncated, false)
}))
test("status parses staged renames as destination then source", () => fixture((context, root) => {
  const git = (...args: string[]): void => {assert.equal(spawnSync("git", args, {cwd: root, env: {...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid"}}).status, 0)}
  git("init", "-q")
  writeFileSync(join(root, "old name"), "unchanged contents")
  git("add", ".")
  git("-c", "commit.gpgsign=false", "commit", "-qm", "fixture")
  git("mv", "old name", "new name")
  const result = gitStatus({root: "repo"}, context)
  assert.equal(result.entries[0]?.path, "new name")
  assert.equal(result.entries[0]?.originalPath, "old name")
}))
test("status never falls back to an ancestor repository", () => fixture((_context, root) => {
  spawnSync("git", ["init", "-q"], {cwd: root})
  mkdirSync(join(root, "nested"))
  const context = createFilesystem({roots: {repo: join(root, "nested")}})
  assert.throws(() => gitStatus({root: "repo"}, context), hasCode("NOT_A_REPOSITORY"))
}))
test("status reports a bounded result", () => fixture((context, root) => {
  spawnSync("git", ["init", "-q"], {cwd: root})
  writeFileSync(join(root, "a"), "a")
  writeFileSync(join(root, "b"), "b")
  const result = gitStatus({root: "repo", maxEntries: 1}, context)
  assert.equal(result.entries.length, 1)
  assert.equal(result.truncated, true)
}))
