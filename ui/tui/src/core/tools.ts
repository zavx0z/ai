import { AI_ROOT, TMP_DIR, Tool } from "./constants"
import { join } from "path"
import type { TargetContext } from "./scanner"

export { TMP_DIR }

export interface TaskAction {
  id: string
  name: string
  description?: string
}

export interface TaskDefinition {
  id: string
  name: string
  description: string
  actions?: TaskAction[]
  run: (ctx: TargetContext, actionId?: string) => Promise<void>
}

// --- Path Constants ---
export const PATH_TREE = Tool("ui/tree-explorer/index.ts")
export const PATH_JOIN = Tool("actions/join/cli.ts")
export const PATH_LINT = Tool("actions/lint/cli.ts")
export const PATH_EDIT = Tool("actions/edit/cli.ts")
export const PATH_COMMIT = Tool("actions/commit/cli.ts")
export const PATH_CLEAN_COMMENTS = Tool("actions/comment/clean-files.ts")

export const TASK_MD = join(TMP_DIR, "task.md")
export const FILES_JSON = join(TMP_DIR, "files.json")
export const JOIN_MD = join(TMP_DIR, "join.md")
export const EDIT_MD = join(TMP_DIR, "edit.md")
export const EDIT_JSON = join(TMP_DIR, "edit.json")
export const LINT_MD = join(TMP_DIR, "lint.md")
export const DIFF_PATCH = join(TMP_DIR, "diff.patch")
export const COMMIT_MD = join(TMP_DIR, "commit.md")

// --- Helpers ---
export async function getExcludes(ctx: TargetContext): Promise<string> {
  const defaultExcludes = [
    "node_modules",
    TMP_DIR,
    ".ai",
    "tmp",
    ".git",
    ".vscode",
    "dist",
    ".idea",
    ".idx",
    "bun.lock",
    "package-lock.json",
    ".cursor",
  ]
  try {
    // Ищем zavx0z.yaml сначала в .ai/, потом в корне проекта
    const configPaths = [
      join(ctx.path, ".ai/zavx0z.yaml"),
      join(ctx.path, "zavx0z.yaml"),
    ]

    for (const configPath of configPaths) {
      const file = Bun.file(configPath)
      if (await file.exists()) {
        const text = await file.text()
        const yaml = Bun.YAML.parse(text) as { exclude?: string[] }

        if (yaml && Array.isArray(yaml.exclude)) {
          return yaml.exclude.map((e: string) => `-e \"${e}\"`).join(" ")
        }
      }
    }
  } catch (e) {}
  return defaultExcludes.map((e) => `-e \"${e}\"`).join(" ")
}

export async function getExcludePatterns(ctx: TargetContext): Promise<string[]> {
  const defaultExcludes = [
    "node_modules",
    TMP_DIR,
    ".ai",
    "tmp",
    ".git",
    ".vscode",
    "dist",
    ".idea",
    ".idx",
    "bun.lock",
    "package-lock.json",
    ".cursor",
  ]
  try {
    // Ищем zavx0z.yaml сначала в .ai/, потом в корне проекта
    const configPaths = [
      join(ctx.path, ".ai/zavx0z.yaml"),
      join(ctx.path, "zavx0z.yaml"),
    ]

    for (const configPath of configPaths) {
      const file = Bun.file(configPath)
      if (await file.exists()) {
        const text = await file.text()
        const yaml = Bun.YAML.parse(text) as { exclude?: string[] }

        if (yaml && Array.isArray(yaml.exclude)) {
          return yaml.exclude
        }
      }
    }
  } catch (e) {}
  return defaultExcludes
}
