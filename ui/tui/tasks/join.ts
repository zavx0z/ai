import { $ } from "bun"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
} from "../src/core/tools"

export const task: TaskDefinition = {
  id: "join",
  name: "📝 Данные",
  description: "Собрать структуру проекта и контент файлов в Markdown",
  run: async (ctx) => {
    await $`mkdir -p ${TMP_DIR}`
    const excludes = await getExcludes(ctx)
    await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
    await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
  },
}
