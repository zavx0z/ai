import { $ } from "bun"
import * as Window from "ai-window"
import { resolve } from "node:path"
import { select } from "../src/ui/select"
import { Theme } from "../src/ui/theme"
import type { TaskDefinition } from "../src/core/tools"
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  PATH_COMMIT,
  TMP_DIR,
  FILES_JSON,
  JOIN_MD,
  COMMIT_MD,
  DIFF_PATCH,
} from "../src/core/tools"

export const task: TaskDefinition = {
  id: "git",
  name: "📦 GIT",
  description: "Git операции + Контекст",
  actions: [
    {
      id: "ful-context",
      name: "📦 Полный контекст",
      description: "Добавить все изменения в коммит и подготовить контекст",
    },
    { id: "changed-context", name: "⚡ Изменения", description: "Контекст только измененных файлов" },
    { id: "select-context", name: "📂 Выбрать файлы", description: "Интерактивный выбор файлов для контекста" },
    { id: "commit-buf", name: "📝 Коммит", description: "Сделать коммит с сообщением из буфера" },
    { id: "push", name: "🚀 Push", description: "git push" },
  ],
  run: async (ctx, actionId) => {
    const excludes = await getExcludes(ctx)
    switch (actionId) {
      case "push":
        await $`git push`
        console.log("✅ Отправлено!")
        return

      case "commit-buf":
        const msg = await $`pbpaste`.text()
        const confirm = await select(
          `Подтвердите коммит:\n${Theme.gray}${msg.trim()}${Theme.reset}`,
          ["✅ Отправить", "❌ Отмена"],
          (o) => o
        )

        if (confirm !== "✅ Отправить") {
          console.log("❌ Отменено")
          return
        }

        await $`git add .`
        await $`pbpaste | git commit -F -`
        console.log("✅ Закоммичено!")
        return

      case "changed-context":
        await $`mkdir -p ${TMP_DIR}`
        await $`git add .`
        await $`git diff --staged > ${DIFF_PATCH}`
        const gitRoot = (await $`git rev-parse --show-toplevel`.text()).trim()
        const changedFiles = (await $`git diff --name-only --cached`.text())
          .trim()
          .split("\n")
          .filter((l) => l.length > 0)
          .map((f) => resolve(gitRoot, f))
        await Bun.write(FILES_JSON, JSON.stringify(changedFiles))
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Контекст изменений обновлен!")

        const currentApp = await Window.getCurrentApp()
        const windows = await Window.getChromeWindows()

        if (windows.length === 0) {
          console.log("❌ Chrome не запущен или нет открытых окон")
          return
        }

        let targetId = windows[0]!.id!
        if (windows.length > 1) {
          const selectedId = await select(
            "🌍 Выберите окно Chrome:",
            windows.map((w) => w.id!),
            (id) => {
              const window = windows.find((w) => w.id === id);
              return window?.title ?? "Без названия";
            }
          )
          if (selectedId) targetId = selectedId
        }

        console.log(`Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`)
        await Window.focusChromeWindow(targetId)

        const initialClipboard = await $`pbpaste`.text()
        const success = await Window.waitForClipboardChange(initialClipboard)

          if (success) {
            console.log("✅ Буфер обновлен! Возвращаюсь...")
            await Window.restoreApp(currentApp)
            
            // Выполняем действия из commit-buf
            const msg = await $`pbpaste`.text()
            const confirm = await select(
              `Подтвердите коммит:\n${Theme.gray}${msg.trim()}${Theme.reset}`,
              ["✅ Отправить", "❌ Отмена"],
              (o) => o
            )

            if (confirm !== "✅ Отправить") {
              console.log("❌ Отменено")
              return
            }

            await $`git add .`
            await $`pbpaste | git commit -F -`
            console.log("✅ Закоммичено!")
          } else {
            console.log("⚠️ Ожидание отменено.")
            await Window.restoreApp(currentApp)
          }
        return

      case "select-context":
        await $`mkdir -p ${TMP_DIR}`
        await $`git add .`
        await $`git diff --staged > ${DIFF_PATCH}`
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -o ${FILES_JSON}`
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Контекст обновлен!")
        return

      default:
        await $`mkdir -p ${TMP_DIR}`
        await $`git add .`
        await $`git diff --staged > ${DIFF_PATCH}`
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`
        await $`bun run ${{ raw: PATH_COMMIT }} ${DIFF_PATCH} -c ${JOIN_MD} -o ${COMMIT_MD}`
        await $`cat ${COMMIT_MD} | pbcopy`
        console.log("✅ Скопировано в буфер!")
        return
    }
  },
}
