/** Чтение каталога раскрывает исходники и никогда не исполняет описываемый инструмент. */
import {describe, expect, test} from "bun:test"
import createDiscovery from "@server/discovery"
import {fileURLToPath} from "node:url"

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url))

describe.each([
  {name: "Обзор чтения", node: "ai/filesystem/read", view: "overview", marker: "Читает"},
  {name: "Контракт чтения", node: "ai/filesystem/read", view: "contract", marker: "namespace FilesystemRead"},
  {name: "Сценарии чтения", node: "ai/filesystem/read", view: "scenarios", marker: "describe.each"},
])("$name", ({node, view, marker}) => {
  const result = createDiscovery({repositoryRoot, runnable: new Set([node])})
  const description = result.describe(node, view) as {node: string; description?: string; source?: string}

  test("Адрес владельца", () => {
    expect(description.node, "Выдача сохраняет выбранный структурный адрес").toBe(node)
  })
  test("Содержание", () => {
    expect(description.source ?? description.description, "Документация извлекается из принадлежащего возможности исходника").toContain(marker)
  })
  test("Каталог", () => {
    expect(result.has("ai/filesystem/roots"), "Удалённый выбор корней отсутствует в каталоге").toBe(false)
    expect(result.has("ai/filesystem/open"), "Удалённое подтверждение alias отсутствует в каталоге").toBe(false)
  })
})
