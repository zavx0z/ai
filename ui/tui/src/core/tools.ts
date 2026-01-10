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