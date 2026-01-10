import { join, resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)

// Поднимаемся на 4 уровня: core -> src -> tui -> ui -> root
export const AI_ROOT = resolve(dirname(__filename), "../../../..")

export const Tool = (path: string) => `"${join(AI_ROOT, path)}"`