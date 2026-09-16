import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, readFileSync, existsSync} from "node:fs"
import {join} from "node:path"
import {applyPatch} from "../index.ts"
import {fixture, hasCode} from "../../shared/spec-fixture.ts"

test("patch adds, updates, moves and deletes regular files", () => fixture((context, root) => {
  writeFileSync(join(root, "old"), "before\n")
  writeFileSync(join(root, "delete"), "gone\n")
  const patch = "*** Begin Patch\n*** Add File: dir/added\n+hello\n*** Update File: old\n*** Move to: moved\n@@\n-before\n+after\n*** Delete File: delete\n*** End Patch\n"
  const result = applyPatch({root: "repo", patch}, context)
  assert.equal(result.applied, true)
  assert.deepEqual(result.changes.map(change => change.operation), ["add", "move", "delete"])
  assert.equal(readFileSync(join(root, "moved"), "utf8"), "after\n")
  assert.equal(readFileSync(join(root, "dir/added"), "utf8"), "hello\n")
  assert.equal(existsSync(join(root, "old")), false)
  assert.equal(existsSync(join(root, "delete")), false)
}))
test("patch dryRun performs no writes or parent creation", () => fixture((context, root) => {
  const result = applyPatch({root: "repo", dryRun: true, patch: "*** Begin Patch\n*** Add File: new/file\n+x\n*** End Patch"}, context)
  assert.equal(result.applied, false)
  assert.equal(existsSync(join(root, "new")), false)
}))
test("patch preflights all operations before writing any file", () => fixture((context, root) => {
  writeFileSync(join(root, "existing"), "actual\n")
  const patch = "*** Begin Patch\n*** Add File: new/file\n+x\n*** Update File: existing\n@@\n-wrong\n+bad\n*** End Patch"
  assert.throws(() => applyPatch({root: "repo", patch}, context), hasCode("PATCH_REJECTED"))
  assert.equal(existsSync(join(root, "new")), false)
  assert.equal(readFileSync(join(root, "existing"), "utf8"), "actual\n")
}))
test("patch refuses ambiguous contexts and duplicate paths", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "x\nx\n")
  assert.throws(() => applyPatch({root: "repo", patch: "*** Begin Patch\n*** Update File: file\n@@\n-x\n+y\n*** End Patch"}, context), hasCode("PATCH_REJECTED"))
  assert.throws(() => applyPatch({root: "repo", patch: "*** Begin Patch\n*** Add File: new\n+x\n*** Add File: new\n+y\n*** End Patch"}, context), hasCode("PATCH_REJECTED"))
  assert.equal(existsSync(join(root, "new")), false)
}))
test("patch preserves CRLF and a missing final newline", () => fixture((context, root) => {
  for (const [name, before, after] of [["crlf", "before\r\n", "after\r\n"], ["plain", "before", "after"]]) {
    writeFileSync(join(root, name!), before!)
    applyPatch({root: "repo", patch: `*** Begin Patch\n*** Update File: ${name}\n@@\n-before\n+after\n*** End Patch`}, context)
    assert.equal(readFileSync(join(root, name!), "utf8"), after)
  }
}))
test("patch End of File anchors the replacement", () => fixture((context, root) => {
  writeFileSync(join(root, "file"), "x\nx\n")
  applyPatch({root: "repo", patch: "*** Begin Patch\n*** Update File: file\n@@\n-x\n+y\n*** End of File\n*** End Patch"}, context)
  assert.equal(readFileSync(join(root, "file"), "utf8"), "x\ny\n")
}))
test("patch rejects traversal before changing a valid earlier file", () => fixture((context, root) => {
  assert.throws(() => applyPatch({root: "repo", patch: "*** Begin Patch\n*** Add File: good\n+x\n*** Add File: ../outside\n+y\n*** End Patch"}, context), hasCode("PATH_NOT_ALLOWED"))
  assert.equal(existsSync(join(root, "good")), false)
}))
test("patch rejects invalid UTF-8 input files", () => fixture((context, root) => {
  writeFileSync(join(root, "binary"), Buffer.from([255]))
  assert.throws(() => applyPatch({root: "repo", patch: "*** Begin Patch\n*** Update File: binary\n@@\n-a\n+b\n*** End Patch"}, context), hasCode("PATCH_REJECTED"))
}))
