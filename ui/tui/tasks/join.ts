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

// Временная функция для очистки комментариев (дублируется из edit-context)
async function cleanCommentsInFiles(filesJson: string, outputMd: string) {
  const files: string[] = JSON.parse(await Bun.file(filesJson).text())
  let result = ""
  
  for (const file of files) {
    try {
      let content = await Bun.file(file).text()
      
      // Удаление TypeDoc комментариев (/** ... */)
      content = content.replace(/\/\*\*[\s\S]*?\*\//g, '')
      
      // Удаление многострочных комментариев (/* ... */)
      content = content.replace(/\/\*[\s\S]*?\*\//g, '')
      
      // Удаление однострочных комментариев (// ...)
      content = content.replace(/\/\/.*$/gm, '')
      
      // Удаление пустых строк после очистки
      content = content.split('\n')
        .filter(line => line.trim() !== '')
        .join('\n')
        
      if (content.trim()) {
        result += `\n## ${file}\n\`\`\`${file.split('.').pop()}\n${content}\n\`\`\`\n`
      }
    } catch (e) {
      console.log(`⚠️ Не удалось прочитать файл: ${file}`)
    }
  }
  
  await Bun.write(outputMd, result)
}

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
        // Используем локальную функцию вместо PATH_CLEAN_COMMENTS
        await cleanCommentsInFiles(FILES_JSON, JOIN_MD)
        break
      default:
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        break
    }
  },
}
