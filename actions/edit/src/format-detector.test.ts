import { describe, expect, test } from "bun:test"
import { detectFormat } from "./format-detector"

describe("detectFormat", () => {
  test("должен определять unified diff по --- a/", () => {
    const content = `--- a/file.ts
+++ b/file.ts
@@ -1 +1 @@
-old
+new`
    expect(detectFormat(content)).toBe("unified-diff")
  })

  test("должен определять unified diff по --- /dev/null", () => {
    const content = `--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1 @@
+new file`
    expect(detectFormat(content)).toBe("unified-diff")
  })

  test("должен определять FILE: формат", () => {
    const content = `FILE: path/to/file.ts

content here`
    expect(detectFormat(content)).toBe("file-format")
  })

  test("должен определять JSON Patch", () => {
    const content = `[{"op": "replace", "path": "/version", "value": "2.0.0"}]`
    expect(detectFormat(content)).toBe("json-patch")
  })

  test("должен определять AI Edit Operations", () => {
    const content = `[{"op": "replace", "path": "AGENT.md", "value": "# Guide"}]`
    expect(detectFormat(content)).toBe("ai-edit")
  })

  test("должен определять AI Edit в markdown-обёртке", () => {
    const content = `\`\`\`json
[{"op": "replace", "path": "AGENT.md", "value": "# Guide"}]
\`\`\``
    expect(detectFormat(content)).toBe("ai-edit")
  })

  test("должен бросать ошибку для неизвестного формата", () => {
    const content = `some unknown format`
    expect(() => detectFormat(content)).toThrow("Неизвестный формат патча")
  })

  test("должен бросать ошибку для обычного JSON объекта", () => {
    const content = `{"key": "value"}`
    expect(() => detectFormat(content)).toThrow("Неизвестный формат патча")
  })
})
