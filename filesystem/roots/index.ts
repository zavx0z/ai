/**
 * Перечисляет только явно разрешённые корни.
 * @remarks Чтение идемпотентно. Абсолютные пути хоста не раскрываются.
 * @packageDocumentation
 */
import {object} from "../../shared/validation.ts"
import type {FilesystemOutput} from "../contract/output.ts"
import type {ListRootsInput} from "./contract/input.ts"
import type {ListRootsOutput} from "./contract/output.ts"
export type {ListRootsInput} from "./contract/input.ts"
export type {ListRootsOutput} from "./contract/output.ts"

export function listRoots(input: ListRootsInput, context: FilesystemOutput): ListRootsOutput {
  object(input, [])
  return {roots: Object.keys(context.roots).sort().map(root => ({root}))}
}
