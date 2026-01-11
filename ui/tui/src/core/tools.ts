import { Tool } from "./constants"
import { join } from "path"
import type { TargetContext } from "./scanner"

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

// --- Helpers ---
export async function getExcludes(ctx: TargetContext): Promise<string> {
  const defaultExcludes = [
    "node_modules",
    "tmp",
    ".git",
    ".vscode",
    "dist",
    ".idea",
    ".idx",
    "bun.lock",
    "package-lock.json",
    ".cursor",
    "zavx0z.yaml",
  ]
  try {
    const configPath = join(ctx.path, "zavx0z.yaml")
    const file = Bun.file(configPath)
    
    if (await file.exists()) {
      const text = await file.text()
      const yaml = Bun.YAML.parse(text) as { exclude?: string[] }
      
      if (yaml && Array.isArray(yaml.exclude)) {
        return yaml.exclude.map((e: string) => `-e "${e}"`).join(" ")
      }
    }
  } catch (e) {}
  return defaultExcludes.map((e) => `-e "${e}"`).join(" ")
}
