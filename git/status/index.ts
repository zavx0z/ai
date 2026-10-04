/**
Читает Git status назначенного корня без shell и произвольных аргументов.

@remarks Вывод ограничен 1 MiB, выполнение — 10 секундами. Превышение предела записей явно отмечается, а не выдаётся за полный результат.

@packageDocumentation
*/
import {spawnSync} from "node:child_process"
import {lstatSync} from "node:fs"
import {join, dirname} from "node:path"
import ToolError from "@zavx0z/ai-tech-failure"
import validation from "@zavx0z/ai-tech-input"
const {object, integer} = validation
import type {AiWorkspace} from "@zavx0z/ai-workspace"

import type {AiGitStatus} from "./contract/index.ts"
export type {AiGitStatus} from "./contract/index.ts"

/**
Читает статус только явно назначенного корня через `git status --porcelain=v1`.

Вывод Git разбирается с NUL-разделителями имён; переименования сохраняют исходный путь. `maxEntries` по умолчанию равен `1000` и ограничен диапазоном `[1..5000]`; команда ограничена 10 секундами и 1 MiB вывода. Исполняемый файл задаётся фиксированно, shell и параметры пользователя не используются.

@param input - Необязательный предел количества записей; неизвестные поля отклоняются.

@param context - Контекст назначенного хостом корня репозитория.

@returns Имя ветки, ограниченный список записей и признак усечения.

@throws Ошибка `INVALID_INPUT` для неверного параметра, `ROOT_NOT_ALLOWED` при смене идентичности корня, `NOT_A_REPOSITORY` если в назначенном корне нет поддерживаемого `.git`, `TIMEOUT` при превышении времени, `LIMIT_EXCEEDED` при превышении объёма вывода и `GIT_ERROR` при ошибке или неожиданном формате Git.
*/
export default function gitStatus(input: AiGitStatus.Input, context: AiWorkspace.Output): AiGitStatus.Output {
  object(input, ["maxEntries"])
  const root = context.directory()
  const maxEntries = integer(input.maxEntries, 1000, 1, 5000, "maxEntries")
  let gitMetadata
  try { gitMetadata = lstatSync(join(root, ".git")) } catch { throw new ToolError("NOT_A_REPOSITORY", "The root is not a Git checkout", 400) }
  if (gitMetadata.isSymbolicLink() || (!gitMetadata.isFile() && !gitMetadata.isDirectory())) throw new ToolError("NOT_A_REPOSITORY", "Git metadata has an unsupported type", 400)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")))
  const result = spawnSync("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--branch", "--untracked-files=normal"], {
    cwd: root, encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024,
    env: {...env, GIT_TERMINAL_PROMPT: "0", GIT_CEILING_DIRECTORIES: dirname(root)},
  })
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT") throw new ToolError("TIMEOUT", "Git status exceeded its execution budget", 504)
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ENOBUFS") throw new ToolError("LIMIT_EXCEEDED", "Git status exceeded its output budget", 413)
  if (result.error !== undefined || result.status !== 0) throw new ToolError("GIT_ERROR", "Git status failed", 502)
  const records = result.stdout.split("\0")
  const header = records.shift() ?? ""
  if (!header.startsWith("## ")) throw new ToolError("GIT_ERROR", "Unexpected Git status header", 502)
  const entries: AiGitStatus.Output["entries"] = []
  let truncated = false
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!
    if (record === "") continue
    if (entries.length >= maxEntries) {
      truncated = true
      break
    }
    if (record.length < 4 || record[2] !== " ") throw new ToolError("GIT_ERROR", "Unexpected Git status record", 502)
    const index = record[0]!
    const worktree = record[1]!
    const renamed = [index, worktree].some(status => status === "R" || status === "C")
    const originalPath = renamed ? records[++i] : undefined
    if (renamed && !originalPath) throw new ToolError("GIT_ERROR", "Incomplete Git rename record", 502)
    entries.push({index, worktree, path: record.slice(3), ...(originalPath === undefined ? {} : {originalPath})})
  }
  return {branch: header.slice(3), entries, truncated}
}
