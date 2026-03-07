import { $ } from "bun";
import { editInEditor } from "../src/ui/editor";
import { select } from "../src/ui/select";
import { Theme } from "../src/ui/theme";
import type { TaskDefinition, TaskAction } from "../src/core/tools";
import {
  getExcludes,
  PATH_TREE,
  PATH_JOIN,
  TMP_DIR,
  TASK_MD,
  FILES_JSON,
  JOIN_MD,
  EDIT_MD,
  PATH_EDIT,
  EDIT_JSON,
} from "../src/core/tools";
import * as Window from "ai-window";
import { Deepseek, Gemini, Alice, Qwen, pasteAndSend } from "ai-chat";
import { stripMarkdownWrapper } from "ai-chat/utils";
import { join } from "path";
import { AI_ROOT } from "../src/core/constants";

// Временная функция для очистки комментариев
async function cleanCommentsInFiles(filesJson: string, outputMd: string) {
  const files: string[] = JSON.parse(await Bun.file(filesJson).text());
  let result = "";

  for (const file of files) {
    try {
      let content = await Bun.file(file).text();

      // Удаление TypeDoc комментариев (/** ... */)
      content = content.replace(/\/\*\*[\s\S]*?\*\//g, "");

      // Удаление многострочных комментариев (/* ... */)
      content = content.replace(/\/\*[\s\S]*?\*\//g, "");

      // Удаление однострочных комментариев (// ...)
      content = content.replace(/\/\/.*$/gm, "");

      // Удаление пустых строк после очистки
      content = content
        .split("\n")
        .filter((line) => line.trim() !== "")
        .join("\n");

      if (content.trim()) {
        result += `\n## ${file}\n\`\`\`${file.split(".").pop()}\n${content}\n\`\`\`\n`;
      }
    } catch (e) {
      console.log(`⚠️ Не удалось прочитать файл: ${file}`);
    }
  }

  await Bun.write(outputMd, result);
}

export const task: TaskDefinition = {
  id: "edit-context",
  name: "🤖 Задача",
  description:
    "Подготовка контекста для AI (включает структуру проекта и документацию)",
  actions: [
    {
      id: "all",
      name: "🌍 Весь проект",
      description: "Все файлы (с фильтрацией исключений)",
    },
    {
      id: "all-clean",
      name: "🧹 Весь проект (очищенный)",
      description: "Все файлы без комментариев (Typedoc и обычные)",
    },
    {
      id: "select",
      name: "🎯 Выбрать файлы",
      description: "Интерактивный выбор через tree-explorer",
    },
    {
      id: "select-clean",
      name: "🧹 Выбрать файлы (очищенные)",
      description: "Интерактивный выбор с очисткой комментариев",
    },
  ],
  run: async (ctx, actionId) => {
    await $`mkdir -p ${TMP_DIR}`;
    const taskDescription = await editInEditor();

    if (!taskDescription) {
      console.log("❌ Отменено (пустое описание)");
      return;
    }
    await Bun.write(TASK_MD, `# Задача\n\n${taskDescription}\n\n`);

    const docBun = join(AI_ROOT, "generator/bun/README.md");
    const docEdit = join(AI_ROOT, "actions/edit/edit.md");
    const excludes = await getExcludes(ctx);

    switch (actionId) {
      case "select":
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} ${{
          raw: (await Bun.file(FILES_JSON).exists()) ? `-i ${FILES_JSON}` : "",
        }} -o ${FILES_JSON}`;
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`;
        break;
      case "select-clean":
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} ${{
          raw: (await Bun.file(FILES_JSON).exists()) ? `-i ${FILES_JSON}` : "",
        }} -o ${FILES_JSON}`;
        // Используем локальную функцию вместо PATH_CLEAN_COMMENTS
        await cleanCommentsInFiles(FILES_JSON, JOIN_MD);
        break;
      case "all-clean":
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`;
        // Используем локальную функцию вместо PATH_CLEAN_COMMENTS
        await cleanCommentsInFiles(FILES_JSON, JOIN_MD);
        break;
      default:
        await $`bun run ${{ raw: PATH_TREE }} ${{ raw: excludes }} -p -o ${FILES_JSON}`;
        await $`bun run ${{ raw: PATH_JOIN }} --file ${FILES_JSON} --output ${JOIN_MD}`;
        break;
    }

    // Создаем начальный файл с задачей
    await $`cat ${TASK_MD} ${JOIN_MD} > ${EDIT_MD}`;

    // Добавляем документацию, если файлы существуют
    const docBunFile = Bun.file(docBun);
    const docEditFile = Bun.file(docEdit);

    if (await docBunFile.exists()) {
      await $`cat ${docBun} >> ${EDIT_MD}`;
    } else {
      console.log(`⚠️ Файл документации не найден: ${docBun}`);
    }

    if (await docEditFile.exists()) {
      await $`cat ${docEdit} >> ${EDIT_MD}`;
    } else {
      console.log(`⚠️ Файл документации не найден: ${docEdit}`);
    }
    const editContent = await Bun.file(EDIT_MD).text();
    const cleanedContent = stripMarkdownWrapper(editContent);
    await $`echo ${cleanedContent} | pbcopy`;
    console.log("✅ Скопировано в буфер!");

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
      console.log(`✅ JSON patch сохранен в ${EDIT_JSON}`);
      await $`bun run ${{ raw: PATH_EDIT }} ${EDIT_JSON}`;
      console.log("✅ Изменения применены!");
    } else {
      console.log("⚠️ Ожидание отменено.");
      await Window.restoreApp(currentApp);
    }
  },
};
