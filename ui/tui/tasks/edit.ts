import { $ } from "bun"
import type { TaskDefinition } from "../src/core/tools"
import { PATH_EDIT, EDIT_JSON } from "../src/core/tools"

export const task: TaskDefinition = {
  id: "edit",
  name: "🔨 Редактирование",
  description: "Применить изменения из AI (конвертирует JSON-патч в правки файлов)",
  actions: [
    { id: "clipboard", name: "📋 Из буфера", description: "pbpaste > edit.json" },
    { id: "file", name: "📄 Из файла", description: ".ai/edit.json" },
  ],
  run: async (ctx, actionId) => {
    switch (actionId) {
      case "clipboard":
        await $`pbpaste > ${EDIT_JSON}`
        break
    }
    await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`
    console.log("✅ Изменения применены!")
  },
}
