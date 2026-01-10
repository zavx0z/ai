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
  getCommand: (ctx: TargetContext, actionId?: string) => Promise<string>
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

export async function getFilesCmd(ctx: TargetContext) {
  const excludes = await getExcludes(ctx)
  return `bun run ${PATH_TREE} ${excludes} -p -o tmp/files.json`
}

export function getJoinCmd() {
  return `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
}

export async function getContextCmd(ctx: TargetContext) {
  const filesCmd = await getFilesCmd(ctx)
  const joinCmd = `bun run ${PATH_JOIN} --file tmp/files.json --output tmp/join.md`
  return `${filesCmd} && ${joinCmd}`
}

export async function getContextChain(ctx: TargetContext) {
  const files = await getFilesCmd(ctx)
  const join = getJoinCmd()
  return `mkdir -p tmp && ${files} && ${join}`
}