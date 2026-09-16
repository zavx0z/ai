import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync} from "node:fs"
import {join} from "node:path"
import {readFiles} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("read-many enforces its shared byte budget", () => fixture((context, root) => {
  writeFileSync(join(root, "a"), "1234")
  writeFileSync(join(root, "b"), "5678")
  const result = readFiles({root: "repo", paths: ["a", "b", "a"], maxTotalBytes: 5}, context)
  assert.equal(result.bytesRead, 5)
  assert.equal(result.remainingBytes, 0)
  assert.equal(result.truncated, true)
  assert.ok("error" in result.files[2]!)
}))
test("read-many preserves per-file errors and successes", () => fixture((context, root) => {
  writeFileSync(join(root, "ok"), "yes")
  const result = readFiles({root: "repo", paths: ["missing", "ok"]}, context)
  assert.ok("error" in result.files[0]!)
  assert.ok("result" in result.files[1]!)
  assert.equal(result.bytesRead, 3)
}))
test("read-many rejects invalid batches before reading", () => fixture(context => {
  for (const paths of [[], Array(51).fill("x"), [1]]) {
    assert.throws(() => readFiles({root: "repo", paths} as never, context), hasCode("INVALID_INPUT"))
  }
}))
