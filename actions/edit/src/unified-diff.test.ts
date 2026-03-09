import { describe, expect, test } from "bun:test"
import { parseUnifiedDiff, applyUnifiedDiff } from "./unified-diff"

describe("parseUnifiedDiff", () => {
  test("должен парсить простой diff с одной заменой", () => {
    const content = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line1
-old line
+new line
 line3`

    const diffs = parseUnifiedDiff(content)
    
    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.oldPath).toBe("file.ts")
    expect(diffs[0]!.newPath).toBe("file.ts")
    expect(diffs[0]!.hunks).toHaveLength(1)
    expect(diffs[0]!.hunks[0]!.lines).toEqual([
      " line1",
      "-old line",
      "+new line",
      " line3",
    ])
  })

  test("должен парсить diff с несколькими ханками", () => {
    const content = `--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,2 @@
-old1
+new1
 line2
@@ -10,2 +10,2 @@
-old2
+new2
 line11`

    const diffs = parseUnifiedDiff(content)
    
    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.hunks).toHaveLength(2)
    expect(diffs[0]!.hunks[0]!.oldStart).toBe(1)
    expect(diffs[0]!.hunks[1]!.oldStart).toBe(10)
  })

  test("должен парсить создание нового файла", () => {
    const content = `--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,2 @@
+line1
+line2`

    const diffs = parseUnifiedDiff(content)
    
    expect(diffs).toHaveLength(1)
    expect(diffs[0]!.oldPath).toBe("/dev/null")
    expect(diffs[0]!.newPath).toBe("new-file.ts")
  })

  test("должен парсить несколько файлов", () => {
    const content = `--- a/file1.ts
+++ b/file1.ts
@@ -1 +1 @@
-old
+new
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1 @@
-foo
+bar`

    const diffs = parseUnifiedDiff(content)
    
    expect(diffs).toHaveLength(2)
    expect(diffs[0]!.oldPath).toBe("file1.ts")
    expect(diffs[1]!.oldPath).toBe("file2.ts")
  })
})

describe("applyUnifiedDiff", () => {
  test("должен применять простую замену", () => {
    const content = `line1
old line
line3`

    const diffContent = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line1
-old line
+new line
 line3`

    const diffs = parseUnifiedDiff(diffContent)
    const result = applyUnifiedDiff(content, diffs[0]!)
    
    expect(result).toBe(`line1
new line
line3`)
  })

  test("должен применять добавление строк", () => {
    const content = `line1
line2`

    const diffContent = `--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
 line1
+inserted
 line2`

    const diffs = parseUnifiedDiff(diffContent)
    const result = applyUnifiedDiff(content, diffs[0]!)
    
    expect(result).toBe(`line1
inserted
line2`)
  })

  test("должен применять удаление строк", () => {
    const content = `line1
to delete
line3`

    const diffContent = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,2 @@
 line1
-to delete
 line3`

    const diffs = parseUnifiedDiff(diffContent)
    const result = applyUnifiedDiff(content, diffs[0]!)
    
    expect(result).toBe(`line1
line3`)
  })

  test("должен бросать ошибку при несовпадении контекста", () => {
    const content = `line1
different content
line3`

    const diffContent = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line1
-old content
+new content
 line3`

    const diffs = parseUnifiedDiff(diffContent)
    expect(() => applyUnifiedDiff(content, diffs[0]!)).toThrow("Hunk does not match")
  })
})
