/** Собственные временные области для проверок инструментов; пользовательские данные не затрагиваются.
 @packageDocumentation
 */
import {mkdtempSync, rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import createWorkspace, {type Zavx0zAiWorkspace} from "@zavx0z/ai-workspace"

/** Подготовка и освобождение временных областей, без регистрации тестов. */
const testing = {
  createFixture() {
    const root = mkdtempSync(join(tmpdir(), "ai-tools-spec-"))
    try {
      return {root, context: createWorkspace({directory: root}), close: () => rmSync(root, {recursive: true, force: true})}
    } catch (error) {
      rmSync(root, {recursive: true, force: true})
      throw error
    }
  },
  async fixture<T>(run: (context: Zavx0zAiWorkspace.Output, root: string) => T | Promise<T>): Promise<T> {
    const fixture = testing.createFixture()
    try { return await run(fixture.context, fixture.root) }
    finally { fixture.close() }
  },
  hasCode(code: string): (error: unknown) => boolean {
    return error => (error as {code?: string} | null)?.code === code
  },
}
export default testing
