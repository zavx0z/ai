import { $ } from "bun";
import { select } from "../src/ui/select";
import { editInEditor } from "../src/ui/editor";
import { Theme } from "../src/ui/theme";
import type { TaskDefinition } from "../src/core/tools";
import {
  TMP_DIR,
  PATH_EDIT,
  EDIT_JSON,
  getExcludePatterns,
  PATH_JOIN,
} from "../src/core/tools";
import { AI_ROOT } from "../src/core/constants";
import { join, resolve } from "path";
import * as Window from "ai-window";
import { pasteAndSend } from "ai-chat";
import { stripMarkdownWrapper } from "ai-chat/utils";

export const task: TaskDefinition = {
  id: "review",
  name: "✨ Извлечение функционала",
  description:
    "Анализ изменений в выбранной ветке и генерация чистого патча для интеграции в текущую ветку",
  run: async (ctx) => {
    const branches = (await $`git branch --format='%(refname:short)'`.text())
      .trim()
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b);

    const targetBranch = await select(
      "Выберите ветку с новым функционалом (её изменения будут проанализированы):",
      branches,
      (b) => b,
    );

    if (!targetBranch) return;

    console.log(
      `🔍 Поиск общего предка между текущей веткой и ${targetBranch}...`,
    );
    const ancestor = (
      await $`git merge-base ${targetBranch} HEAD`.text()
    ).trim();
    if (!ancestor) {
      console.log("❌ Общий предок не найден");
      return;
    }

    const diff = await $`git diff ${ancestor} ${targetBranch}`.text();
    if (!diff.trim()) {
      console.log("✨ В ветке нет изменений относительно общего предка");
      return;
    }

    console.log("📊 Получение списка изменённых файлов...");
    const changedFiles = (
      await $`git diff --name-only ${ancestor} ${targetBranch}`.text()
    )
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);

    const excludePatterns = await getExcludePatterns(ctx);
    const gitRoot = (await $`git rev-parse --show-toplevel`.text()).trim();
    const filteredFiles = changedFiles.filter((file) => {
      const filePath = resolve(gitRoot, file);
      const relativePath = filePath.replace(gitRoot + "/", "");
      return !excludePatterns.some((pattern) => {
        if (pattern.includes("*")) {
          const regexPattern = pattern.replace(/\*/g, ".*");
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(relativePath) || regex.test(file);
        }
        return (
          relativePath === pattern ||
          relativePath.startsWith(pattern + "/") ||
          file === pattern ||
          file.includes("/" + pattern + "/") ||
          file.endsWith("/" + pattern)
        );
      });
    });

    let changedFilesContent = "";
    if (filteredFiles.length > 0) {
      const REVIEW_FILES_JSON = join(TMP_DIR, "review-files.json");
      const REVIEW_JOIN_MD = join(TMP_DIR, "review-join.md");
      await Bun.write(REVIEW_FILES_JSON, JSON.stringify(filteredFiles));
      await $`bun run ${{ raw: PATH_JOIN }} --file ${REVIEW_FILES_JSON} --output ${REVIEW_JOIN_MD}`;
      changedFilesContent = await Bun.file(REVIEW_JOIN_MD).text();
      console.log(`📄 Добавлено ${filteredFiles.length} файлов в контекст`);
    }

    const comments = await editInEditor(`
# Извлечение функционала из ветки "${targetBranch}"

Опишите, **какой функционал из представленных изменений нужно сохранить**,
и **какие части являются временными, ошибочными или нежелательными**.

Примеры:
- "Сохранить новую функцию createUser, но убрать console.log и временные комментарии"
- "Нужна только логика валидации из этого файла, остальное — мусор"
- "Форматирование поправить под наш стиль, имена переменных сделать понятными"

ИИ сгенерирует **чистый патч**, который можно применить к **текущей ветке**.
`);

    if (!comments) {
      console.log("❌ Отменено");
      return;
    }

    const REVIEW_COMMENTS_MD = join(TMP_DIR, "review-comments.md");
    await Bun.write(REVIEW_COMMENTS_MD, comments);
    console.log(`📝 Пожелания сохранены в ${REVIEW_COMMENTS_MD}`);

    const editDocPath = join(AI_ROOT, "actions/edit/edit.md");
    const editDoc = await Bun.file(editDocPath)
      .text()
      .catch(() => "");

    const prompt = `
# Основная задача

${comments}

# Контекст

Анализируются изменения в ветке **${targetBranch}** от общего предка (**${ancestor}**) до её HEAD.
Эти изменения содержат **новый функционал**, но могут включать **временные решения, ошибки или нарушения стиля**.

Цель: **извлечь суть рабочего функционала** и **сгенерировать чистый, безопасный патч**,
который можно применить к **текущему состоянию проекта** (вашей ветке).

## Правила формирования ответа (Edit Format)
${editDoc}

## Изменения (Diff из ${targetBranch})
\`\`\`diff
${diff}
\`\`\`
${
  changedFilesContent
    ? `
## Содержимое затронутых файлов (из текущей ветки)
${changedFilesContent}
`
    : ""
}

Сгенерируй валидный JSON (EditRequest) для применения **чистых, безопасных правок**.
`;

    const REVIEW_REQUEST_MD = join(TMP_DIR, "review-request.md");
    await Bun.write(REVIEW_REQUEST_MD, prompt);
    console.log(`📝 Промпт сохранён в ${REVIEW_REQUEST_MD}`);

    const cleanedPrompt = stripMarkdownWrapper(prompt);
    await $`echo ${cleanedPrompt} | pbcopy`;
    console.log("✅ Промпт скопирован в буфер обмена!");

    const currentApp = await Window.getCurrentApp();
    const windows = await Window.getChromeWindows();
    if (windows.length === 0) {
      console.log("❌ Chrome не запущен");
      return;
    }

    let targetId = windows[0]!.id!;
    if (windows.length > 1) {
      const selected = await select(
        "🌍 Выберите окно Chrome:",
        windows,
        (w) => w.title,
      );
      if (selected) targetId = selected.id!;
    }

    console.log(
      `Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`,
    );
    await Window.focusChromeWindow(targetId);
    await pasteAndSend();

    const initialClipboard = await $`pbpaste`.text();
    const success = await Window.waitForClipboardChange(initialClipboard);

    if (success) {
      console.log("✅ Буфер обновлён! Возвращаюсь...");
      await Window.restoreApp(currentApp);
      await $`pbpaste > ${EDIT_JSON}`;
      console.log("✅ JSON patch сохранен в tmp/edit.json");
      console.log("🔨 Применяю правки...");
      try {
        await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`;
        console.log("✅ Правки применены!");
      } catch (e) {
        console.error("❌ Ошибка применения правок:", e);
      }
    } else {
      console.log("⚠️ Ожидание отменено.");
      await Window.restoreApp(currentApp);
    }
  },
};
