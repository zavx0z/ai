/**
 * Проверяет доступность зарегистрированного корня.
 * @remarks Не добавляет новые разрешения. Не требует запущенного процесса или Git.
 * @packageDocumentation
 */
import {object} from "../../shared/validation.ts"
import {workspace} from "../shared/paths.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {OpenWorkspaceInput} from "./contract/input.ts"
import type {OpenWorkspaceOutput} from "./contract/output.ts"
export type {OpenWorkspaceInput} from "./contract/input.ts"
export type {OpenWorkspaceOutput} from "./contract/output.ts"

export function openWorkspace(input: OpenWorkspaceInput, context: FilesystemOutput): OpenWorkspaceOutput {
  object(input, ["root"])
  workspace(context, input.root)
  return {root: input.root, path: "."}
}
