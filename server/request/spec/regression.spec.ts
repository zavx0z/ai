import {test} from "bun:test"
import assert from "node:assert/strict"
import {writeFileSync, readFileSync} from "node:fs"
import {join} from "node:path"
import createRequestHandler from "@server/request"
import startServer from "@ai/server"
import testing from "@ai/testing"
const {fixture, hasCode} = testing
import {repositoryRoot, token, post} from "./fixture.ts"

test("HTTP GET and empty JSON POST discover the same root", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const get = await app.handle(new Request("http://localhost/tools", {headers: {authorization: `Bearer ${token}`}}))
  const empty = await app.handle(post({}))
  assert.equal(get.status, 200)
  assert.deepEqual(await get.json(), await empty.json())
}))
test("HTTP requires a token even for discovery", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const response = await app.handle(new Request("http://localhost/tools"))
  assert.equal(response.status, 401)
  assert.equal(response.headers.get("www-authenticate"), "Bearer")
  assert.equal((await response.json()).error.code, "UNAUTHORIZED")
}))
test("HTTP discovers a tool and its contract without executing it", () => fixture(async (filesystem, root) => {
  writeFileSync(join(root, "file"), "unchanged")
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const overview = await app.handle(post({node: "ai/filesystem/write"}))
  assert.equal((await overview.json()).runnable, true)
  const contract = await app.handle(post({node: "ai/filesystem/write", input: {view: "contract"}}))
  assert.match((await contract.json()).source, /expectedHash/)
  const scenario = await app.handle(post({node: "ai/filesystem/write", input: {view: "scenarios"}}))
  assert.equal((await scenario.json()).executed, false)
  assert.equal(readFileSync(join(root, "file"), "utf8"), "unchanged")
}))
test("HTTP executes the real public filesystem function", () => fixture(async (filesystem, root) => {
  writeFileSync(join(root, "file"), "hello")
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const response = await app.handle(post({node: "ai/filesystem/read", action: "run", input: {path: "file"}}))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).content, "hello")
}))
test("HTTP rejects arbitrary imports, technical owners and unknown actions", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  for (const [body, status] of [
    [{node: "../../etc/passwd", action: "run"}, 404],
    [{node: "ai/server/request", action: "run"}, 403],
    [{node: "ai/filesystem/read", action: "execute"}, 400],
    [{node: "ai/filesystem/read", input: {path: "file"}}, 400],
    [{node: "ai/filesystem/read", action: "run", input: []}, 400],
    [{extra: true}, 400],
    [[], 400],
  ] as const) {
    assert.equal((await app.handle(post(body))).status, status)
  }
}))
test("HTTP maps missing paths, conflicts and traversal to distinct statuses", () => fixture(async (filesystem, root) => {
  writeFileSync(join(root, "existing"), "old")
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const missing = await app.handle(post({node: "ai/filesystem/read", action: "run", input: {path: "missing"}}))
  assert.equal(missing.status, 404)
  const conflict = await app.handle(post({node: "ai/filesystem/create", action: "run", input: {path: "existing", content: "new"}}))
  assert.equal(conflict.status, 409)
  const denied = await app.handle(post({node: "ai/filesystem/read", action: "run", input: {path: "../private"}}))
  assert.equal(denied.status, 403)
  assert.equal(readFileSync(join(root, "existing"), "utf8"), "old")
}))
test("HTTP rejects unsupported methods, media types and browser origins", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  assert.equal((await app.handle(new Request("http://localhost/tools", {method: "DELETE", headers: {authorization: `Bearer ${token}`}}))).status, 405)
  assert.equal((await app.handle(post({}, {"content-type": "text/plain"}))).status, 415)
  assert.equal((await app.handle(post({}, {origin: "https://untrusted.invalid"}))).status, 403)
  assert.equal((await app.handle(new Request("http://localhost/v1/tools", {headers: {authorization: `Bearer ${token}`}}))).status, 404)
}))
test("HTTP rejects invalid JSON and oversized bodies", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot})
  const invalid = new Request("http://localhost/tools", {method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"}, body: "{"})
  assert.equal((await app.handle(invalid)).status, 400)
  assert.equal((await app.handle(post({}, {"content-length": "13000000"}))).status, 413)
  const large = new Request("http://localhost/tools", {method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"}, body: "x".repeat(12 * 1024 * 1024 + 1)})
  assert.equal((await app.handle(large)).status, 413)
}))
test("HTTP logs operation metadata, never file contents or credentials", () => fixture(async filesystem => {
  const logs: unknown[] = []
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot, logger: event => logs.push(event)})
  const response = await app.handle(post({node: "ai/filesystem/create", action: "run", input: {path: "file", content: "private-content-marker"}}))
  assert.equal(response.status, 200)
  const encoded = JSON.stringify(logs)
  assert.equal(encoded.includes(token), false)
  assert.equal(encoded.includes("private-content-marker"), false)
  assert.ok(encoded.includes(response.headers.get("x-request-id")!))
}))
test("a diagnostics failure does not invalidate a completed operation", () => fixture(async filesystem => {
  const app = createRequestHandler({workspace: filesystem, token, repositoryRoot, logger: () => {throw new Error("logger unavailable")}})
  const response = await app.handle(post({node: "ai/filesystem/create", action: "run", input: {path: "file", content: "ok"}}))
  assert.equal(response.status, 200)
}))
test("server refuses a weak or absent token before listening", () => fixture(filesystem => {
  assert.throws(() => createRequestHandler({workspace: filesystem, token: "short", repositoryRoot}), hasCode("INVALID_INPUT"))
}))
test("real loopback HTTP host serves tools without Interpreter or browser packages", () => fixture(async (_filesystem, root) => {
  writeFileSync(join(root, "file"), "network")
  const host = await startServer({directory: root, token, repositoryRoot, port: 0, log: false})
  try {
    const response = await fetch(host.url, {method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
      body: JSON.stringify({node: "ai/filesystem/read", action: "run", input: {path: "file"}})})
    assert.equal(response.status, 200)
    assert.equal((await response.json()).content, "network")
  } finally { await host.close() }
}))
