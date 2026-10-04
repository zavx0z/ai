import {test} from "bun:test"
import assert from "node:assert/strict"
import {bindings, tools} from "../src/bindings.ts"
import testing from "@zavx0z/ai-testing"

test("реестр связывает ровно публичные имена с исполняемыми функциями", () => testing.fixture(workspace => {
  const registered = tools.map(tool => tool.name)
  const bound = [...bindings(workspace).keys()]
  assert.equal(registered.length, 11, "Опубликованы десять файловых операций и Git status")
  assert.equal(new Set(registered).size, 11, "Имена в реестре уникальны")
  assert.deepEqual(bound.sort(), [...registered].sort(), "Каждое публичное имя связано с исполнителем")
  assert.deepEqual([...registered].sort(), [
    "filesystem.apply-patch", "filesystem.create", "filesystem.list", "filesystem.mkdir",
    "filesystem.read", "filesystem.read-many", "filesystem.remove", "filesystem.rename",
    "filesystem.stat", "filesystem.write", "git.status",
  ], "Технические пакеты не входят в исполняемый каталог")
  for (const tool of tools) {
    assert.equal(typeof tool.packageName, "string", "Связь с реальным пакетом сохранена для генерации схемы")
    assert.equal(typeof tool.execute, "function", "Публичный адрес имеет исполняемую функцию")
  }
}))
