import {describe, test} from "bun:test"
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {mkdirSync} from "node:fs"
import {join} from "node:path"
import gitStatus from "@zavx0z/ai-git-status"
import createWorkspace from "@zavx0z/ai-workspace"
import testing from "@zavx0z/ai-testing"

const {fixture, hasCode} = testing

describe("Ошибки Git status", () => {
  test("Родительский репозиторий не используется", () => fixture((_context, root) => {
    assert.equal(spawnSync("git", ["init", "-q"], {cwd: root}).status, 0)
    mkdirSync(join(root, "nested"))
    const context = createWorkspace({directory: join(root, "nested")})
    assert.throws(() => gitStatus({}, context), hasCode("NOT_A_REPOSITORY"), "Статус ограничен точной рабочей директорией, даже когда выше есть Git")
  }))

  test("Устаревший выбор корня", () => fixture(context => {
    assert.throws(() => gitStatus({root: "repo"} as never, context), hasCode("INVALID_INPUT"), "Вход инструмента не принимает поле выбора корня")
  }))
})
