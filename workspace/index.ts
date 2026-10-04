/**
 Закрепляет одну рабочую директорию за контекстом исполнения инструментов.
 Хост создаёт отдельный контекст для каждой сессии и передаёт его исполнителю.
 Путь хранится в замыкании; создание другого контекста не меняет эту область или cwd.
 @packageDocumentation
 */
import {realpathSync, lstatSync} from "node:fs"
import {isAbsolute} from "node:path"
import ToolError from "@zavx0z/ai-tech-failure"
import validation from "@zavx0z/ai-tech-input"
import {pathInRoot, relativeTo} from "./src/paths.ts"
import type {Zavx0zAiWorkspace} from "./contract/index.ts"
export type {Zavx0zAiWorkspace} from "./contract/index.ts"

/**
 Проверяет назначение хоста и создаёт неизменяемый контекст.
 @param input - Существующая абсолютная директория хоста.
 @returns Контекст с проверкой границы перед каждым разрешением пути.
 @throws ToolError при неверной конфигурации; ошибки ОС при недоступной директории.
 */
export default function createWorkspace(input: Zavx0zAiWorkspace.Input): Zavx0zAiWorkspace.Output {
  validation.object(input, ["directory"])
  const configured = validation.text(input.directory, "directory")
  if (!isAbsolute(configured)) throw new ToolError("INVALID_INPUT", "Workspace directory must be absolute")
  const directory = realpathSync(configured)
  const identity = lstatSync(directory)
  if (!identity.isDirectory()) throw new ToolError("INVALID_INPUT", "Workspace must be a directory")
  /**
  Подтверждает сохранность назначенной директории перед разрешением очередного пути.

  @returns Канонический абсолютный путь этого контекста.

  @throws ToolError при замене директории или её превращении в символическую ссылку.
  */
  const check = (): string => {
    const current = lstatSync(directory)
    if (current.isSymbolicLink() || !current.isDirectory() || realpathSync(directory) !== directory
      || current.dev !== identity.dev || current.ino !== identity.ino) {
      throw new ToolError("ROOT_NOT_ALLOWED", "Assigned workspace changed identity", 403)
    }
    return directory
  }
  return Object.freeze({
    directory: check,
    resolve: (path, options) => pathInRoot(check(), path, options),
    relative: path => relativeTo(check(), path),
  } satisfies Zavx0zAiWorkspace.Output)
}
