/**
 * JSON Patch Parser (RFC 6902)
 * Парсит JSON Patch формат и конвертирует в FileOperation
 */

import type { FileOperation } from "./types"

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test"
  path: string
  value?: any
  from?: string
}

export function parseJsonPatch(content: string): JsonPatchOperation[] {
  return JSON.parse(content)
}

export function applyJsonPatchToJsonFile(jsonContent: string, operations: JsonPatchOperation[]): string {
  let data = JSON.parse(jsonContent)
  
  for (const op of operations) {
    data = applySingleOperation(data, op)
  }
  
  return JSON.stringify(data, null, 2)
}

function applySingleOperation(data: any, op: JsonPatchOperation): any {
  const parts = parseJsonPointer(op.path)
  
  switch (op.op) {
    case "add":
      return addOperation(data, parts, op.value)
    case "remove":
      return removeOperation(data, parts)
    case "replace":
      return replaceOperation(data, parts, op.value)
    case "move":
      if (!op.from) throw new Error("Move operation requires 'from'")
      return moveOperation(data, parseJsonPointer(op.from), parts)
    case "copy":
      if (!op.from) throw new Error("Copy operation requires 'from'")
      return copyOperation(data, parseJsonPointer(op.from), parts)
    case "test":
      const testResult = testOperation(data, parts, op.value)
      if (!testResult) {
        throw new Error(`JSON Patch test failed at ${op.path}`)
      }
      return data
    default:
      throw new Error(`Unknown JSON Patch operation: ${op.op}`)
  }
}

function parseJsonPointer(pointer: string): string[] {
  if (pointer === "") return []
  return pointer.slice(1).split("/").map(unescapeJsonPointer)
}

function unescapeJsonPointer(str: string): string {
  return str.replace(/~1/g, "/").replace(/~0/g, "~")
}

function addOperation(data: any, parts: string[], value: any): any {
  if (parts.length === 0) {
    return value
  }
  
  const parent = getPointerParent(data, parts)
  const key = parts[parts.length - 1]!
  
  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : parseInt(key, 10)
    parent.splice(index, 0, value)
  } else {
    parent[key] = value
  }
  
  return data
}

function removeOperation(data: any, parts: string[]): any {
  if (parts.length === 0) {
    throw new Error("Cannot remove root")
  }
  
  const parent = getPointerParent(data, parts)
  const key = parts[parts.length - 1]!
  
  if (Array.isArray(parent)) {
    parent.splice(parseInt(key, 10), 1)
  } else {
    delete parent[key]
  }
  
  return data
}

function replaceOperation(data: any, parts: string[], value: any): any {
  if (parts.length === 0) {
    return value
  }
  
  const parent = getPointerParent(data, parts)
  const key = parts[parts.length - 1]!
  parent[key] = value
  
  return data
}

function moveOperation(data: any, fromParts: string[], toParts: string[]): any {
  const value = getPointerValue(data, fromParts)
  data = removeOperation(data, fromParts)
  data = addOperation(data, toParts, value)
  return data
}

function copyOperation(data: any, fromParts: string[], toParts: string[]): any {
  const value = getPointerValue(data, fromParts)
  data = addOperation(data, toParts, value)
  return data
}

function testOperation(data: any, parts: string[], value: any): boolean {
  const actual = getPointerValue(data, parts)
  return JSON.stringify(actual) === JSON.stringify(value)
}

function getPointerParent(data: any, parts: string[]): any {
  const parentParts = parts.slice(0, -1)
  return getPointerValue(data, parentParts)
}

function getPointerValue(data: any, parts: string[]): any {
  let current = data
  for (const part of parts) {
    if (current === undefined) {
      throw new Error(`Pointer not found: /${parts.join("/")}`)
    }
    current = current[part]
  }
  return current
}

export function jsonPatchToFileOperation(
  jsonPath: string,
  operations: JsonPatchOperation[]
): FileOperation {
  return {
    file: jsonPath,
    action: "replace",
    // JSON patch применяется к содержимому файла
    search: "", // Пустой search означает, что мы работаем со всем файлом
    replace: JSON.stringify({ operations }, null, 2),
  }
}
