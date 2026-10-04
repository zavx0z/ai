import {lstatSync, realpathSync} from "node:fs"
import {isAbsolute, join, relative, resolve, sep} from "node:path"
import ToolError from "@ai-tech/failure"
import validation from "@ai-tech/input"
const {text} = validation

export function relativePath(value: unknown, allowRoot = false): string {
  const path = text(value, "path", allowRoot)
  if (path.includes("\0") || path.includes("\\") || isAbsolute(path) || /^[a-zA-Z]:/.test(path)) {
    throw new ToolError("PATH_NOT_ALLOWED", "Path must be a portable relative path", 403)
  }
  if (Buffer.byteLength(path) > 4096) throw new ToolError("PATH_NOT_ALLOWED", "Path is too long", 403)
  const parts = path.split("/").filter(part => part !== "" && part !== ".")
  if (parts.some(part => part === ".." || part.toLowerCase() === ".git")) {
    throw new ToolError("PATH_NOT_ALLOWED", "Parent traversal and Git metadata are not exposed", 403)
  }
  if (parts.length === 0 && !allowRoot) throw new ToolError("PATH_NOT_ALLOWED", "The root itself cannot be changed", 403)
  return parts.join("/") || "."
}

/** Запрещает переходы через ссылки, включая ссылку в месте назначения записи. */
export function pathInRoot(root: string, input: unknown, options: {allowRoot?: boolean; missing?: boolean; finalSymlink?: boolean} = {}): string {
  const path = relativePath(input, options.allowRoot)
  if (path === ".") return root
  if (Buffer.byteLength(path) > 4096) throw new ToolError("PATH_NOT_ALLOWED", "Path is too long", 403)
  const parts = path.split("/")
  let current = root
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]!)
    let stat
    try { stat = lstatSync(current) } catch (error) {
      if (options.missing && (error as NodeJS.ErrnoException).code === "ENOENT") return resolve(root, path)
      throw error
    }
    if (stat.isSymbolicLink() && !(options.finalSymlink && i === parts.length - 1)) {
      throw new ToolError("PATH_NOT_ALLOWED", "Symlink traversal is not permitted", 403)
    }
    if (i < parts.length - 1 && !stat.isDirectory()) throw new ToolError("INVALID_PATH_TYPE", "A parent is not a directory")
  }
  return current
}

export function relativeTo(root: string, path: string): string {
  return relative(root, path).split(sep).join("/") || "."
}
