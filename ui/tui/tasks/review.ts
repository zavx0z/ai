import { $ } from "bun"
import { select } from "../src/ui/select"
import { editInEditor } from "../src/ui/editor"
import { Theme } from "../src/ui/theme"
import type { TaskDefinition } from "../src/core/tools"
import {
  TMP_DIR,
  PATH_EDIT,
  EDIT_JSON,
  getExcludePatterns,
  PATH_JOIN,
} from "../src/core/tools"
import { AI_ROOT } from "../src/core/constants"
import { join, resolve } from "path"
import * as Window from "ai-window"
import { pasteAndSend } from "ai-chat"

export const task: TaskDefinition = {
  id: "review",
  name: "🧐 Ревью",
  description: "Анализ изменений ветки относительно предка и генерация правок",
  run: async (ctx) => {
    // 1. Выбор ветки
    const branches = (await $`git branch --format='%(refname:short)'`.text())
      .trim()
      .split("\n")
      .map(b => b.trim())
      .filter(b => b)
    
    const targetBranch = await select(
      "Выберите базовую ветку (общий предок):", 
      branches, 
      b => b
    )
    
    if (!targetBranch) return

    // 2. Поиск предка
    console.log(`🔍 Поиск общего предка с ${targetBranch}...`)
    const ancestor = (await $`git merge-base ${targetBranch} HEAD`.text()).trim()
    
    if (!ancestor) {
      console.log("❌ Общий предок не найден")
      return
    }

    // 3. Получение diff
    // Берем diff от предка до конца истории выбранной ветки
    const diff = await $`git diff ${ancestor} ${targetBranch}`.text()
    
    if (!diff.trim()) {
      console.log("✨ Изменений нет")
      return
    }

    // 3.1. Получение списка измененных файлов из diff
    console.log("📊 Получение списка измененных файлов...")
    const changedFiles = (await $`git diff --name-only ${ancestor} ${targetBranch}`.text())
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)

    // 3.2. Фильтрация по исключениям
    const excludePatterns = await getExcludePatterns(ctx)
    const gitRoot = (await $`git rev-parse --show-toplevel`.text()).trim()
    const filteredFiles = changedFiles.filter((file) => {
      const filePath = resolve(gitRoot, file)
      const relativePath = filePath.replace(gitRoot + '/', '')
      
      return !excludePatterns.some((pattern) => {
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*')
          const regex = new RegExp(`^${regexPattern}$`)
          return regex.test(relativePath) || regex.test(file)
        }
        
        return relativePath === pattern || 
               relativePath.startsWith(pattern + '/') ||
               file === pattern ||
               file.includes('/' + pattern + '/') ||
               file.endsWith('/' + pattern)
      })
    })

    // 3.3. Добавление измененных файлов в контекст
    let changedFilesContent = ""
    if (filteredFiles.length > 0) {
      const REVIEW_FILES_JSON = join(TMP_DIR, "review-files.json")
      const REVIEW_JOIN_MD = join(TMP_DIR, "review-join.md")
      
      await Bun.write(REVIEW_FILES_JSON, JSON.stringify(filteredFiles))
      await $`bun run ${{ raw: PATH_JOIN }} --file ${REVIEW_FILES_JSON} --output ${REVIEW_JOIN_MD}`
      
      changedFilesContent = await Bun.file(REVIEW_JOIN_MD).text()
      console.log(`📄 Добавлено ${filteredFiles.length} файлов в контекст`)
    }

    // 4. Комментарии пользователя (Пожелания)
    const comments = await editInEditor(`
# Ревью изменений

Опишите, что вам нравится и не нравится в текущих изменениях.
Например:
- "Мне не нравится нейминг в функции X"
- "Нужно добавить обработку ошибок в Y"
- "В целом ок, но поправь форматирование"

AI учтет это при генерации JSON-патча.
`)

    if (!comments) {
        console.log("❌ Отменено")
        return
    }

    // Сохраняем пожелания в tmp файл
    const REVIEW_COMMENTS_MD = join(TMP_DIR, "review-comments.md")
    await Bun.write(REVIEW_COMMENTS_MD, comments)
    console.log(`📝 Пожелания сохранены в ${REVIEW_COMMENTS_MD}`)

    // 5. Формирование промпта
    const editDocPath = join(AI_ROOT, "actions/edit/edit.md")
    const editDoc = await Bun.file(editDocPath).text().catch(() => "")
    
    const prompt = `
# Основная задача

${comments}

# Контекст ревью

Мы анализируем изменения ветки ${targetBranch} относительно общего предка.
Общий предок: ${ancestor}

## Правила формирования ответа (Edit Format)
${editDoc}

## Изменения (Diff)
\`\`\`diff
${diff}
\`\`\`
${changedFilesContent ? `
## Измененные файлы (содержимое)
${changedFilesContent}
` : ''}

Сгенерируй валидный JSON (EditRequest) для применения необходимых правок.
`

    // Сохраняем промпт в файл
    const REVIEW_REQUEST_MD = join(TMP_DIR, "review-request.md")
    await Bun.write(REVIEW_REQUEST_MD, prompt)
    console.log(`📝 Промпт сохранен в ${REVIEW_REQUEST_MD}`)

    await $`echo ${prompt} | pbcopy`
    console.log("✅ Промпт скопирован в буфер обмена!")

    // 6. Interaction with AI
    const currentApp = await Window.getCurrentApp()
    const windows = await Window.getChromeWindows()

    if (windows.length === 0) {
      console.log("❌ Chrome не запущен")
      return
    }

    let targetId = windows[0]!.id!
    let title = windows[0]!.title?.toLowerCase() || ""

    if (windows.length > 1) {
      const selected = await select("🌍 Выберите окно Chrome:", windows, (w) => w.title)
      if (selected) {
        targetId = selected.id!
        title = selected.title?.toLowerCase() || ""
      }
    }

    console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)
    await Window.focusChromeWindow(targetId)

    await pasteAndSend()

    // Wait for response
    const initialClipboard = await $`pbpaste`.text()
    const success = await Window.waitForClipboardChange(initialClipboard)

    if (success) {
      console.log("✅ Буфер обновлен! Возвращаюсь...")
      await Window.restoreApp(currentApp)
      
      // Сохраняем и применяем
      await $`pbpaste > ${EDIT_JSON}`
      console.log("🔨 Применяю правки...")
      
      try {
        await $`bun run ${ { raw: PATH_EDIT } } ${EDIT_JSON}`
        console.log("✅ Правки применены!")
      } catch (e) {
        console.error("❌ Ошибка применения правок:", e)
      }
    } else {
      console.log("⚠️ Ожидание отменено.")
      await Window.restoreApp(currentApp)
    }
  },
}
