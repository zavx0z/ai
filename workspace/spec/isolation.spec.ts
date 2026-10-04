import {test, expect} from "bun:test"
import {mkdirSync, renameSync, symlinkSync, writeFileSync, readFileSync} from "node:fs"
import {join} from "node:path"
import createWorkspace from "@zavx0z/ai-workspace"
import readFile from "@zavx0z/ai-filesystem-read"
import writeFile from "@zavx0z/ai-filesystem-write"
import createRequestHandler from "@zavx0z/ai-server-request"
import testing from "@zavx0z/ai-testing"

const token = "temporary-workspace-isolation-token-12345"

test("Два одновременно существующих контекста читают и изменяют только свою область", async () => {
  const a = testing.createFixture()
  const b = testing.createFixture()
  const cwd = process.cwd()
  try {
    writeFileSync(join(a.root, "same"), "A")
    writeFileSync(join(b.root, "same"), "B")
    const handlers = [a, b].map(item => createRequestHandler({workspace: item.context, token}))
    const request = (content: string) => new Request("http://localhost/tools", {
      method: "POST", headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
      body: JSON.stringify({name: "filesystem.write", arguments: {path: "same", content}}),
    })
    const responses = await Promise.all(handlers.map((handler, index) => handler.handle(request(index === 0 ? "AA" : "BB"))))
    expect(responses.map(response => response.status), "Оба параллельных запроса завершились успешно").toEqual([200, 200])
    expect(await Promise.all(responses.map(async response => Object.keys(await response.json()))), "Оба ответа используют новую оболочку result").toEqual([["result"], ["result"]])
    expect(readFile({path: "same"}, a.context).content, "Первый контекст остаётся связан с A").toBe("AA")
    expect(readFile({path: "same"}, b.context).content, "Второй контекст остаётся связан с B").toBe("BB")
    expect(process.cwd(), "Параллельные обработчики не переназначают cwd").toBe(cwd)
  } finally { a.close(); b.close() }
})

test("Подставленный root отклоняется до записи в любую область", async () => {
  const a = testing.createFixture()
  const b = testing.createFixture()
  try {
    writeFileSync(join(a.root, "file"), "A")
    writeFileSync(join(b.root, "file"), "B")
    expect(() => writeFile({root: b.root, path: "file", content: "bad"} as never, a.context),
      "Неизвестное поле root не выбирает другую директорию").toThrow("Unknown field: root")
    expect(readFileSync(join(a.root, "file"), "utf8"), "Назначенный файл не затронут отказом").toBe("A")
    expect(readFileSync(join(b.root, "file"), "utf8"), "Внешний файл не затронут отказом").toBe("B")
  } finally { a.close(); b.close() }
})

test("Хост отклоняет неявное назначение и прежнюю карту roots", () => {
  for (const input of [{directory: "."}, {directory: ""}, {roots: {}}, {}]) {
    expect(() => createWorkspace(input as never), "Область задаётся одной явной абсолютной директорией").toThrow()
  }
})

test("Подмена назначенной директории символической ссылкой отклоняется", () => {
  const outer = testing.createFixture()
  try {
    const assigned = join(outer.root, "assigned")
    mkdirSync(assigned)
    const context = createWorkspace({directory: assigned})
    renameSync(assigned, join(outer.root, "old"))
    symlinkSync("old", assigned)
    expect(() => context.resolve("file", {missing: true}), "Исходное назначение не следует подменённой ссылке").toThrow("changed identity")
  } finally { outer.close() }
})
