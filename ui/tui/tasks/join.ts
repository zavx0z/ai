import { $ } from "bun"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  PATH_CLEAN_COMMENTS,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
} from "../src/core/tools"

export const task: TaskDefinition = {
  id: "join",
  name: "📝 Данные",
  description: "Собрать структуру проекта и контент файлов в Markdown",
  actions: [
    { id: "all", name: "🌍 Весь проект", description: "Все файлы (с фильтрацией исключений)" },
    { id: "all-clean", name: "🧹 Весь проект (очищенный)", description: "Все файлы без комментариев (Typedoc и обычные)" },
  ],
  run: async (ctx, actionId) => {
    await $`mkdir -p ${TMP_DIR}`
    const excludes = await getExcludes(ctx)
    await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
    
    switch (actionId) {
      case "all-clean":
        await $`bun run ${{ raw: PATH_CLEAN_COMMENTS }} ${FILES_JSON} --output ${JOIN_MD}`
        break
      default:
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        break
    }
  },
}
