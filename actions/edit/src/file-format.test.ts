import { describe, expect, test } from "bun:test"
import { parseFileFormat, fileEditToOperation } from "./file-format"

describe("parseFileFormat", () => {
  test("должен парсить whole file rewrite", () => {
    const content = `FILE: path/to/file.ts

export const value = 42
console.log("hello")`

    const edits = parseFileFormat(content)
    
    expect(edits).toHaveLength(1)
    expect(edits[0]!.path).toBe("path/to/file.ts")
    expect(edits[0]!.mode).toBe("rewrite")
    expect(edits[0]!.content).toContain("export const value = 42")
  })

  test("должен парсить search/replace", () => {
    const content = `FILE: path/to/file.ts

SEARCH
const old = 1

REPLACE
const newValue = 42`

    const edits = parseFileFormat(content)
    
    expect(edits).toHaveLength(1)
    expect(edits[0]!.path).toBe("path/to/file.ts")
    expect(edits[0]!.mode).toBe("search-replace")
    expect(edits[0]!.search).toBe("const old = 1")
    expect(edits[0]!.replace).toBe("const newValue = 42")
  })

  test("должен парсить несколько FILE: блоков", () => {
    const content = `FILE: file1.ts

content1

FILE: file2.ts

SEARCH
old

REPLACE
new`

    const edits = parseFileFormat(content)
    
    expect(edits).toHaveLength(2)
    expect(edits[0]!.path).toBe("file1.ts")
    expect(edits[0]!.mode).toBe("rewrite")
    expect(edits[1]!.path).toBe("file2.ts")
    expect(edits[1]!.mode).toBe("search-replace")
  })

  test("должен обрабатывать многострочный search/replace", () => {
    const content = `FILE: path/to/file.ts

SEARCH
function old() {
  return 1
}

REPLACE
function new() {
  return 42
}`

    const edits = parseFileFormat(content)
    
    expect(edits).toHaveLength(1)
    expect(edits[0]!.search).toContain("function old()")
    expect(edits[0]!.replace).toContain("function new()")
  })
})

describe("fileEditToOperation", () => {
  test("должен конвертировать rewrite в overwrite операцию", () => {
    const edit = {
      path: "file.ts",
      mode: "rewrite" as const,
      content: "new content",
    }

    const op = fileEditToOperation(edit)
    
    expect(op.file).toBe("file.ts")
    expect(op.action).toBe("overwrite")
    expect(op.replace).toBe("new content")
  })

  test("должен конвертировать search-replace в replace операцию", () => {
    const edit = {
      path: "file.ts",
      mode: "search-replace" as const,
      search: "old",
      replace: "new",
    }

    const op = fileEditToOperation(edit)
    
    expect(op.file).toBe("file.ts")
    expect(op.action).toBe("replace")
    expect(op.search).toBe("old")
    expect(op.replace).toBe("new")
  })
})
