import {test, expect} from "bun:test"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import createFile from "@ai-filesystem/create"
import writeFile from "@ai-filesystem/write"
import applyPatch from "@ai-filesystem/apply-patch"
import testing from "@ai/testing"

test("Превышение бюджета записи отклоняется до изменения файла или создания родителей", () => testing.fixture((context, directory) => {
  writeFileSync(join(directory, "file"), "before")
  const content = "x".repeat(8 * 1024 * 1024 + 1)
  expect(() => writeFile({path: "file", content}, context), "Запись сверх 8 MiB отклоняется").toThrow("byte limit")
  expect(() => createFile({path: "new/file", content, createParents: true}, context), "Создание сверх 8 MiB отклоняется до mkdir").toThrow("byte limit")
  expect(readFileSync(join(directory, "file"), "utf8"), "Исходное содержимое сохранено").toBe("before")
  expect(existsSync(join(directory, "new")), "Родитель не создан после ошибки декодирования/лимита").toBe(false)
}))

test("Patch сообщает завершённые изменения при отказе IO после первого эффекта", () => testing.fixture((context, directory) => {
  let failure: unknown
  try {
    applyPatch({patch: "*** Begin Patch\n*** Add File: parent\n+file\n*** Add File: parent/child\n+child\n*** End Patch"}, context)
  } catch (error) { failure = error }
  expect(failure, "Неуспешный второй mkdir не объявляет многофайловую атомарность").toMatchObject({
    code: "PARTIAL_FAILURE",
    details: {completed: [{operation: "add", path: "parent", bytes: 5}], current: {operation: "add", path: "parent/child", bytes: 6}},
  })
  expect(readFileSync(join(directory, "parent"), "utf8"), "Первый завершённый эффект остаётся доступным для сверки").toBe("file\n")
}))
