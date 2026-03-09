/**
 * FILE: Format Parser
 * Парсит форматы:
 * 1. Whole File Rewrite: FILE: path\n\n<content>
 * 2. Search/Replace: FILE: path\n\nSEARCH\n<old>\n\nREPLACE\n<new>
 */

import type { FileOperation } from "./types"

export interface FileEdit {
  path: string
  mode: "rewrite" | "search-replace"
  content?: string // Для rewrite
  search?: string  // Для search-replace
  replace?: string // Для search-replace
}

export function parseFileFormat(content: string): FileEdit[] {
  const edits: FileEdit[] = []
  const blocks = splitByFileMarker(content)
  
  for (const block of blocks) {
    const edit = parseFileBlock(block)
    if (edit) {
      edits.push(edit)
    }
  }
  
  return edits
}

function splitByFileMarker(content: string): string[] {
  const blocks: string[] = []
  const lines = content.split(/\r?\n/)
  
  let currentBlock = ""
  let inBlock = false
  
  for (const line of lines) {
    if (line.startsWith("FILE:")) {
      if (inBlock && currentBlock.trim()) {
        blocks.push(currentBlock)
      }
      currentBlock = line + "\n"
      inBlock = true
    } else if (inBlock) {
      currentBlock += line + "\n"
    }
  }
  
  if (inBlock && currentBlock.trim()) {
    blocks.push(currentBlock)
  }
  
  return blocks
}

function parseFileBlock(block: string): FileEdit | null {
  const lines = block.split(/\r?\n/)
  const fileLine = lines[0]
  
  if (!fileLine?.startsWith("FILE:")) {
    return null
  }
  
  const path = fileLine.slice(5).trim()
  const content = lines.slice(1).join("\n").trim()
  
  // Проверяем, есть ли SEARCH/REPLACE маркеры
  const searchMarkerIdx = findMarkerIndex(lines, "SEARCH")
  const replaceMarkerIdx = findMarkerIndex(lines, "REPLACE")
  
  if (searchMarkerIdx !== -1 && replaceMarkerIdx !== -1) {
    // Search/Replace mode
    const search = lines.slice(searchMarkerIdx + 1, replaceMarkerIdx).join("\n")
    const replace = lines.slice(replaceMarkerIdx + 1).join("\n")
    
    return {
      path,
      mode: "search-replace",
      search: search.trim(),
      replace: replace.trim(),
    }
  }
  
  // Whole file rewrite
  return {
    path,
    mode: "rewrite",
    content: content,
  }
}

function findMarkerIndex(lines: string[], marker: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim() === marker) {
      return i
    }
  }
  return -1
}

export function fileEditToOperation(edit: FileEdit): FileOperation {
  if (edit.mode === "rewrite") {
    return {
      file: edit.path,
      action: "overwrite",
      replace: edit.content || "",
    }
  }
  
  // search-replace
  return {
    file: edit.path,
    action: "replace",
    search: edit.search,
    replace: edit.replace,
  }
}
