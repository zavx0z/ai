import { task as editContextTask } from "./edit-context"
import { task as editTask } from "./edit"
import { task as joinTask } from "./join"
import { task as lintTask } from "./lint"
import { task as gitTask } from "./git"
import { task as reviewTask } from "./review"
import type { TaskDefinition } from "../src/core/tools"

export const TASKS: TaskDefinition[] = [
  editContextTask,
  editTask,
  reviewTask,
  joinTask,
  lintTask,
  gitTask,
]
