/** Один обработчик закрепляется за назначенной областью и исполняет именованные инструменты. */
import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {spawnSync} from "node:child_process"
import {readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import createRequestHandler from "@zavx0z/ai-server-request"
import testing from "@zavx0z/ai-testing"
import {get, post, token} from "./fixture.ts"

const {createFixture} = testing

describe.each([
  {
    name: "Каталог инструментов",
    request: null,
    prepare: (_root: string) => {},
    kind: "catalog",
  },
  {
    name: "Чтение файла",
    request: {name: "filesystem.read", arguments: {path: "file"}},
    prepare: (root: string) => writeFileSync(join(root, "file"), "данные"),
    kind: "read",
  },
  {
    name: "Создание файла",
    request: {name: "filesystem.create", arguments: {path: "created", content: "новый"}},
    prepare: (_root: string) => {},
    kind: "create",
  },
  {
    name: "Список пустой директории",
    request: {name: "filesystem.list", arguments: {}},
    prepare: (_root: string) => {},
    kind: "list",
  },
  {
    name: "Git status",
    request: {name: "git.status", arguments: {}},
    prepare: (root: string) => {
      const git = spawnSync("git", ["init", "-q"], {cwd: root})
      if (git.status !== 0) throw new Error(`git init: ${git.stderr.toString()}`)
    },
    kind: "git",
  },
])("$name", ({request, prepare, kind}) => {
  let frame: ReturnType<typeof createFixture>
  let response: Response
  let data: Record<string, unknown>

  beforeAll(async () => {
    frame = createFixture()
    prepare(frame.root)
    const handler = createRequestHandler({workspace: frame.context, token})
    response = await handler.handle(request === null ? get() : post(request))
    data = await response.json() as Record<string, unknown>
  })
  afterAll(() => frame?.close())

  test("Форма ответа", () => {
    expect(response.status, "Авторизованный вызов или запрос каталога завершён успешно").toBe(200)
    expect(Object.keys(data), "Успешный ответ содержит ровно одно поле result").toEqual(["result"])
  })

  /** @remarks Только запрос GET возвращает каталог, а не результат одной операции. */
  describe.skipIf(kind !== "catalog")("Каталог", () => {
    test("Имена и схемы", () => {
      const descriptors = data.result as Array<Record<string, unknown>>
      const names = descriptors.map(item => item.name)
      expect([...names].sort(), "Каталог содержит только одиннадцать публичных исполняемых инструментов").toEqual([
        "filesystem.apply-patch", "filesystem.create", "filesystem.list", "filesystem.mkdir",
        "filesystem.read", "filesystem.read-many", "filesystem.remove", "filesystem.rename",
        "filesystem.stat", "filesystem.write", "git.status",
      ])
      for (const descriptor of descriptors) {
        expect(Object.keys(descriptor).sort(), "Описание не раскрывает исходники, сценарии, контракты или внутренние метаданные пакета").toEqual(["arguments", "description", "name", "result"])
        expect(descriptor.description, "Описание инструмента извлечено из его публичной документации").toBeString()
        expect((descriptor.description as string).length, "Описание имеет содержательный текст").toBeGreaterThan(0)
        expect(descriptor.arguments, "Аргументы опубликованы как JSON Schema").toBeObject()
        expect(descriptor.result, "Результат опубликован как JSON Schema").toBeObject()
        expect(JSON.stringify(descriptor.arguments).includes('"root"'), "Схема аргументов не возвращает удалённый выбор рабочей директории").toBeFalse()
      }
    })
  })

  /** @remarks Чтение файла применимо только к варианту filesystem.read. */
  describe.skipIf(kind !== "read")("Чтение", () => {
    test("Содержимое", () => {
      const result = data.result as {content: string}
      expect(result.content, "Инструмент читает данные в назначенной хостом директории").toBe("данные")
    })
  })

  /** @remarks Создание файла применимо только к варианту filesystem.create. */
  describe.skipIf(kind !== "create")("Создание", () => {
    test("Побочный эффект", () => {
      const result = data.result as {bytes: number}
      expect(result.bytes, "Ответ сообщает записанный объём UTF-8").toBe(Buffer.byteLength("новый"))
      expect(readFileSync(join(frame.root, "created"), "utf8"), "Созданный файл содержит переданные данные").toBe("новый")
    })
  })

  /** @remarks Пустой список применим только к варианту filesystem.list. */
  describe.skipIf(kind !== "list")("Список", () => {
    test("Пустая директория", () => {
      const result = data.result as {entries: unknown[]}
      expect(result.entries, "Пустая назначенная директория возвращает пустой инвентарь").toEqual([])
    })
  })

  /** @remarks Git status применим только к варианту с созданным репозиторием. */
  describe.skipIf(kind !== "git")("Git", () => {
    test("Пустой индекс", () => {
      const result = data.result as {entries: unknown[]}
      expect(result.entries, "Инициализированный репозиторий не содержит изменений").toEqual([])
    })
  })
})
