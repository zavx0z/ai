import { describe, expect, test } from "bun:test"
import { parseJsonPatch, applyJsonPatchToJsonFile } from "./json-patch"

describe("parseJsonPatch", () => {
  test("должен парсить JSON Patch массив", () => {
    const content = `[
      {"op": "replace", "path": "/version", "value": "2.0.0"},
      {"op": "add", "path": "/newField", "value": "data"}
    ]`

    const operations = parseJsonPatch(content)
    
    expect(operations).toHaveLength(2)
    expect(operations[0]!.op).toBe("replace")
    expect(operations[1]!.op).toBe("add")
  })
})

describe("applyJsonPatchToJsonFile", () => {
  test("должен применять replace операцию", () => {
    const json = `{"version": "1.0.0", "name": "test"}`
    const patch = `[{"op": "replace", "path": "/version", "value": "2.0.0"}]`

    const result = applyJsonPatchToJsonFile(json, parseJsonPatch(patch))
    const parsed = JSON.parse(result)
    
    expect(parsed.version).toBe("2.0.0")
    expect(parsed.name).toBe("test")
  })

  test("должен применять add операцию", () => {
    const json = `{"name": "test"}`
    const patch = `[{"op": "add", "path": "/version", "value": "1.0.0"}]`

    const result = applyJsonPatchToJsonFile(json, parseJsonPatch(patch))
    const parsed = JSON.parse(result)
    
    expect(parsed.version).toBe("1.0.0")
    expect(parsed.name).toBe("test")
  })

  test("должен применять remove операцию", () => {
    const json = `{"name": "test", "version": "1.0.0"}`
    const patch = `[{"op": "remove", "path": "/version"}]`

    const result = applyJsonPatchToJsonFile(json, parseJsonPatch(patch))
    const parsed = JSON.parse(result)
    
    expect(parsed.version).toBeUndefined()
    expect(parsed.name).toBe("test")
  })

  test("должен применять операции к вложенным объектам", () => {
    const json = `{"config": {"debug": false}}`
    const patch = `[{"op": "replace", "path": "/config/debug", "value": true}]`

    const result = applyJsonPatchToJsonFile(json, parseJsonPatch(patch))
    const parsed = JSON.parse(result)
    
    expect(parsed.config.debug).toBe(true)
  })

  test("должен применять add к массиву", () => {
    const json = `{"items": [1, 2]}`
    const patch = `[{"op": "add", "path": "/items/-", "value": 3}]`

    const result = applyJsonPatchToJsonFile(json, parseJsonPatch(patch))
    const parsed = JSON.parse(result)
    
    expect(parsed.items).toEqual([1, 2, 3])
  })

  test("должен бросать ошибку при failed test операции", () => {
    const json = `{"version": "1.0.0"}`
    const patch = `[{"op": "test", "path": "/version", "value": "2.0.0"}]`

    expect(() => applyJsonPatchToJsonFile(json, parseJsonPatch(patch)))
      .toThrow("JSON Patch test failed")
  })
})
