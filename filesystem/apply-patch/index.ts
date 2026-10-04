/**
Применяет текстовый patch формата Begin Patch с предварительной проверкой всех операций.

@remarks Нет нестрогого поиска совпадений. Неоднозначные hunks и повторные изменения пути отклоняются. Ошибки планирования не меняют файлы; ошибки записи могут привести к `PARTIAL_FAILURE`. Операции не образуют многофайловую транзакцию.

@packageDocumentation
*/
import {lstatSync, mkdirSync, writeFileSync, unlinkSync} from "node:fs"
import {dirname} from "node:path"
import validation from "@tech/input"
const {object, text, boolean} = validation
import ToolError from "@tech/failure"
import access from "@filesystem/access"
const {readWhole, digest, replaceFile, MAX_BYTES} = access
import {parsePatch, applyHunks} from "./src/parse.ts"
import type {AiWorkspace} from "@ai/workspace"

import type {FilesystemApplyPatch} from "./contract/index.ts"
export type {FilesystemApplyPatch} from "./contract/index.ts"

/**
Проверяет пакетный текстовый patch, строит план изменений, затем применяет его по одному файлу.

Поддерживаются операции `Add File`, `Update File`, `Delete File` и `Move to`; hunk-и должны однозначно совпадать с UTF-8 содержимым. До `dryRun`-ответа создаются только внутренние планы, каталоги не создаются. Предел patch — `8388608` входных байтов и `50` файлов; ошибка во время записи останавливает цикл и сообщает уже завершённые изменения в `PARTIAL_FAILURE`.

@param input - Текст patch и необязательный режим проверки без записи; неизвестные поля отклоняются.

@param context - Контекст назначенной хостом рабочей области.

@returns План изменений с `applied: false` для dry run либо список завершённых изменений с `applied: true`.

@throws Ошибка `INVALID_INPUT` для неверной формы, `ROOT_NOT_ALLOWED` при смене идентичности корня, `LIMIT_EXCEEDED` при превышении бюджета, `PATCH_REJECTED` при неподдерживаемом или неоднозначном patch, `CONFLICT` при занятом назначении или изменившемся источнике, а также `PARTIAL_FAILURE` при ошибке записи после начала применения.
*/
export default function applyPatch(input: FilesystemApplyPatch.Input, context: AiWorkspace.Output): FilesystemApplyPatch.Output {
  object(input, ["patch", "dryRun"])
  const patch = text(input.patch, "patch")
  const dryRun = boolean(input.dryRun, false, "dryRun")
  if (Buffer.byteLength(patch) > MAX_BYTES) throw new ToolError("LIMIT_EXCEEDED", "Patch exceeds the byte limit", 413)
  context.directory()
  const operations = parsePatch(patch)
  const touched = new Set<string>()
  let totalBytes = 0
  const planned = operations.map(operation => {
    const path = context.resolve(operation.path, {missing: operation.kind === "add"})
    const target = operation.kind === "update" && operation.to !== undefined ? context.resolve(operation.to, {missing: true}) : path
    if (touched.has(path) || (target !== path && touched.has(target))) throw new ToolError("PATCH_REJECTED", "Patch touches a path more than once", 409)
    touched.add(path)
    touched.add(target)
    if (operation.kind === "add" || target !== path) {
      try {
        lstatSync(target)
        throw new ToolError("CONFLICT", "Patch destination already exists", 409)
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
    }
    const before = operation.kind === "add" ? undefined : readWhole(path)
    const data = operation.kind === "add" ? Buffer.from(operation.lines.join("\n") + (operation.lines.length ? "\n" : ""))
      : operation.kind === "update" ? applyHunks(before!, operation.hunks) : undefined
    totalBytes += (before?.length ?? 0) + (data?.length ?? 0)
    if (totalBytes > MAX_BYTES * 2 || (data?.length ?? 0) > MAX_BYTES) throw new ToolError("LIMIT_EXCEEDED", "Patch working set exceeds the byte limit", 413)
    const operationName = operation.kind === "update" && target !== path ? "move" : operation.kind
    const change: FilesystemApplyPatch.Output["changes"][number] = {operation: operationName, path: context.relative(target), ...(target === path ? {} : {from: context.relative(path)}), bytes: data?.length ?? 0}
    return {path, target, before, data, change}
  })
  if (dryRun) return {applied: false, changes: planned.map(item => item.change)}
  const completed: FilesystemApplyPatch.Output["changes"] = []
  for (const item of planned) {
    try {
      if (item.before !== undefined && digest(readWhole(item.path)) !== digest(item.before)) throw new ToolError("CONFLICT", "A patch source changed after validation", 409)
      if (item.data !== undefined) {
        if (item.change.operation === "update") replaceFile(item.path, item.data, digest(item.before!))
        else {
          mkdirSync(dirname(item.target), {recursive: true})
          writeFileSync(item.target, item.data, {flag: "wx", mode: item.before === undefined ? 0o600 : lstatSync(item.path).mode & 0o777})
        }
      }
      if (item.change.operation === "delete" || item.change.operation === "move") unlinkSync(item.path)
      completed.push(item.change)
    } catch (error) {
      const failure = ToolError.from(error)
      throw new ToolError("PARTIAL_FAILURE", "Patch application stopped; inspect affected paths before retrying", 500,
        {completed, current: item.change, cause: failure.code})
    }
  }
  return {applied: true, changes: completed}
}
