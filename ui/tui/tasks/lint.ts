import { $ } from "bun";
import { select } from "../src/ui/select";
import type { TaskDefinition } from "../src/core/tools";
import {
  PATH_LINT,
  TMP_DIR,
  LINT_MD,
  PATH_EDIT,
  EDIT_JSON,
} from "../src/core/tools";
import * as Window from "ai-window";
import { Deepseek, Gemini, Alice, Qwen, pasteAndSend } from "ai-chat";
import { stripMarkdownWrapper } from "ai-chat/utils";

export const task: TaskDefinition = {
  id: "lint",
  name: "🧹 Ошибки",
  description: "Собрать TypeScript ошибки и контекст проекта в буфер",
  run: async (ctx) => {
    await $`mkdir -p ${TMP_DIR}`;

    // 1. Запуск линтера
    console.log("🧹 Запуск проверки ошибок...");
    await $`bun run ${{ raw: PATH_LINT }} . -o ${LINT_MD}`;

    // 2. Проверка наличия ошибок
    const lintContent = await Bun.file(LINT_MD).text();
    if (!lintContent.trim()) {
      console.log("✨ Ошибок не найдено. Отличная работа!");
      return;
    }

    console.log(`⚠️ Найдено ошибок. Собираю контекст...`);

    // 1. Извлекаем чистый JSON из отчета
    let jsonStr = lintContent;

    // Удаляем префикс "Исправь ошибки \n" если он есть
    const prefix = "Исправь ошибки \n";
    if (jsonStr.startsWith(prefix)) {
      jsonStr = jsonStr.substring(prefix.length);
    }

    // Удаляем суффикс с правилами если он есть
    const suffixIndex = jsonStr.indexOf(
      "\n# Инструкция для генерации изменений кода (AI Patcher)",
    );
    if (suffixIndex !== -1) {
      jsonStr = jsonStr.substring(0, suffixIndex);
    }

    // Парсим JSON
    let diagnostics: Array<{
      file: string;
      code: string;
      message: string;
      context: string;
    }> = [];
    try {
      diagnostics = JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("❌ Не удалось распарсить JSON с ошибками:", error);
      // Если не получается, копируем как есть
      const cleanedContent = stripMarkdownWrapper(lintContent);
      await $`echo ${cleanedContent} | pbcopy`;
      console.log("✅ Скопировано в буфер (сырые данные)");
      return;
    }

    // 2. Собираем уникальные файлы с ошибками
    const filesWithErrors = [...new Set(diagnostics.map((d) => d.file))];

    // 3. Собираем исходный код файлов с ошибками
    let sourceCodeContent = "\n\n## 📁 Исходный код файлов с ошибками:\n\n";

    for (const filePath of filesWithErrors) {
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const fileContent = await file.text();
          // Находим ошибки для этого файла
          const fileErrors = diagnostics.filter((d) => d.file === filePath);

          sourceCodeContent += `### 📄 ${filePath}\n`;
          sourceCodeContent += `**Ошибок в файле:** ${fileErrors.length}\n\n`;

          // Добавляем контекст ошибок
          fileErrors.forEach((error, index) => {
            sourceCodeContent += `**Ошибка ${index + 1} (${error.code}):** ${error.message}\n`;
            sourceCodeContent += `\`\`\`typescript
${error.context}\n\`\`\`\n\n`;
          });

          // Добавляем полный исходный код
          sourceCodeContent += `**Полный исходный код:**\n\n\`\`\`typescript
${fileContent}\n\`\`\`\n\n---\n\n`;
        } else {
          sourceCodeContent += `### ${filePath}\n⚠️ Файл не найден\n\n---\n\n`;
        }
      } catch (error) {
        sourceCodeContent += `### ${filePath}\n⚠️ Ошибка чтения файла: ${error}\n\n---\n\n`;
      }
    }

    // 4. Объединяем ошибки и исходный код
    const finalContent = lintContent + sourceCodeContent;

    // 5. Сохраняем и копируем в буфер
    await Bun.write(`${TMP_DIR}/lint_with_sources.md`, finalContent);
    const cleanedContent = stripMarkdownWrapper(finalContent);
    await $`echo ${cleanedContent} | pbcopy`;
    console.log("✅ Скопировано в буфер с исходным кодом!");
    console.log(`📊 Найдено файлов с ошибками: ${filesWithErrors.length}`);
    console.log(`📊 Всего ошибок: ${diagnostics.length}`);

    // 4. AI Patcher Logic (применение исправлений)
    const currentApp = await Window.getCurrentApp();
    const windows = await Window.getChromeWindows();

    if (windows.length === 0) {
      console.log("❌ Chrome не запущен или нет открытых окон");
      return;
    }

    let targetId = windows[0]!.id!;
    let title = windows[0]!.title?.toLowerCase() || "";

    if (windows.length > 1) {
      const selected = await select(
        "🌍 Выберите окно Chrome:",
        windows,
        (w) => w.title,
      );
      if (selected) {
        targetId = selected.id!;
        title = selected.title?.toLowerCase() || "";
      }
    }

    const service = ["deepseek", "gemini", "алиса", "qwen"].find((s) =>
      title.includes(s),
    );

    const mode = await select(
      "🤖 Выберите режим:",
      [
        { id: "new", name: "✨ В новом чате" },
        { id: "current", name: "💬 В текущем чате" },
      ],
      (m) => m.name,
    );

    if (!mode) return;

    console.log(
      `Текущее приложение: "${currentApp}". Переключаюсь на Chrome...`,
    );

    await Window.focusChromeWindow(targetId);

    if (mode.id === "new") {
      switch (service) {
        case "deepseek":
          await Deepseek.openNewChat();
          break;
        case "gemini":
          await Gemini.openNewChat();
          break;
        case "алиса":
          await Alice.openNewChat();
          break;
        case "qwen":
          await Qwen.openNewChat();
          break;
      }
    }

    await pasteAndSend();

    const initialClipboard = await $`pbpaste`.text();
    const success = await Window.waitForClipboardChange(initialClipboard);

    if (success) {
      console.log("✅ Буфер обновлен! Возвращаюсь...");
      await Window.restoreApp(currentApp);
      await $`pbpaste > ${EDIT_JSON}`;
      console.log("✅ JSON patch сохранен в tmp/edit.json");
      await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`;
      console.log("✅ Изменения применены!");
    } else {
      console.log("⚠️ Ожидание отменено.");
      await Window.restoreApp(currentApp);
    }
  },
};
