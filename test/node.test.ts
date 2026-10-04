import {test} from "node:test"
import assert from "node:assert/strict"
import {writeFileSync, readFileSync, existsSync} from "node:fs"
import {join} from "node:path"
import readFile from "@filesystem/read"
import writeFile from "@filesystem/write"
import applyPatch from "@filesystem/apply-patch"
import startServer from "@ai/server"
import testing from "@ai/testing"

test("Node исполняет чтение, запись с hash и patch через публичные входы", () => testing.fixture((context, directory) => {
  writeFileSync(join(directory, "file"), "before\n")
  const before = readFile({path: "file"}, context)
  writeFile({path: "file", content: "after\n", expectedHash: before.contentHash!}, context)
  assert.throws(() => writeFile({path: "file", content: "stale", expectedHash: before.contentHash!}, context), testing.hasCode("CONFLICT"))
  assert.throws(() => readFile({path: "../outside"}, context), testing.hasCode("PATH_NOT_ALLOWED"))
  applyPatch({patch: "*** Begin Patch\n*** Update File: file\n@@\n-after\n+patched\n*** Add File: new\n+ok\n*** End Patch"}, context)
  assert.equal(readFileSync(join(directory, "file"), "utf8"), "patched\n")
  assert.equal(existsSync(join(directory, "new")), true)
}))

test("Два Node HTTP-хоста сохраняют свои области и отклоняют root извне", async () => {
  const a = testing.createFixture()
  const b = testing.createFixture()
  const token = "node-integration-temporary-token-12345"
  const hosts: Awaited<ReturnType<typeof startServer>>[] = []
  try {
    for (const [fixture, content] of [[a, "A"], [b, "B"]] as const) {
      writeFileSync(join(fixture.root, "file"), content)
      hosts.push(await startServer({directory: fixture.root, token, port: 0, log: false}))
    }
    const request = async (url: string, input: unknown) => fetch(url, {
      method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
      body: JSON.stringify({node: "ai/filesystem/read", action: "run", input}),
    })
    const responses = await Promise.all(hosts.map(host => request(host.url, {path: "file"})))
    assert.deepEqual(responses.map(response => response.status), [200, 200])
    assert.deepEqual(await Promise.all(responses.map(async response => (await response.json()).content)), ["A", "B"])
    assert.equal((await request(hosts[0]!.url, {root: b.root, path: "file"})).status, 400)
  } finally {
    await Promise.all(hosts.map(host => host.close()))
    a.close()
    b.close()
  }
})
