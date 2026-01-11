import { $ } from "bun"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  PATH_LINT,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
  LINT_MD,
} from "../src/core/tools"

export const task: TaskDefinition = {
  id: "lint",
  name: "🧹 Ошибки",
  description: "Сбор данных для исправления ошибок",
  run: async (ctx) => {
    await $`mkdir -p ${TMP_DIR}`
    const excludes = await getExcludes(ctx)
    await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
    await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
    await $`bun run ${{ raw: PATH_LINT }} . -o ${LINT_MD}`
    await $`cat ${JOIN_MD} >> ${LINT_MD}`
    await $`cat ${LINT_MD} | pbcopy`
    console.log("✅ Скопировано в буфер!")
  },
}
