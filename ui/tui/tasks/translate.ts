import { $ } from "bun";
import { input } from "../src/ui/input";
import { select } from "../src/ui/select";
import { filePicker } from "../src/ui/filepicker";
import type { TaskDefinition } from "../src/core/tools";
import { TMP_DIR } from "../src/core/tools";
import * as Window from "ai-window";
import { Deepseek, Gemini, Alice, Qwen, pasteAndSend } from "ai-chat";
import { stripMarkdownWrapper } from "ai-chat/utils";
import { join } from "path";
import { AI_ROOT } from "../src/core/constants";

export const task: TaskDefinition = {
  id: "translate",
  name: "🔄 Перевод",
  description: "Перевести текст через Ollama (EN↔RU)",
  run: async (ctx) => {
    // Проверка доступности Ollama
    console.log("🔍 Проверка Ollama...");
    
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        console.log("❌ Ollama недоступна (ошибка соединения)");
        console.log("   Запустите: ollama serve");
        console.log("   Или установите: brew install ollama");
        return;
      }
    } catch (error) {
      console.log("❌ Ollama недоступна");
      console.log("   1. Запустите: ollama serve");
      console.log("   2. Или установите: brew install ollama");
      console.log("   3. Проверьте: curl http://localhost:11434/api/tags");
      return;
    }
    
    // Проверка установленных моделей
    console.log("📦 Проверка моделей...");
    try {
      const modelsResponse = await fetch("http://localhost:11434/api/tags");
      const modelsData = await modelsResponse.json() as { models?: Array<{ name: string }> };
      const installedModels = modelsData.models?.map(m => m.name) || [];
      
      if (!installedModels.some(m => m.includes('gemma2') || m.includes('translator'))) {
        console.log("⚠️  Нет установленных моделей!");
        console.log("   Установите: ollama pull gemma2:2b");
        console.log("   Или создайте переводчик: bun run ollama:setup");
        return;
      }
    } catch {
      // Игнорируем ошибку проверки моделей
    }

    // Выбор направления перевода
    const direction = await select(
      "Направление перевода:",
      [
        { id: "en-ru", name: "🇬🇧 EN → 🇷🇺 RU" },
        { id: "ru-en", name: "🇷🇺 RU → 🇬🇧 EN" },
      ],
      (d) => d.name,
    );

    if (!direction) return;

    // Выбор стиля
    const style = await select(
      "Стиль перевода:",
      [
        { id: "formal", name: "📋 Официальный" },
        { id: "technical", name: "⚙️ Технический" },
        { id: "casual", name: "💬 Разговорный" },
        { id: "literary", name: "📚 Литературный" },
      ],
      (s) => s.name,
    );

    if (!style) return;

    // Автовыбор модели по стилю и направлению
    const MODEL_MAP: Record<string, Record<string, string>> = {
      'en-ru': {
        formal: 'translator-en-ru',
        technical: 'translator-tech-en-ru',
        casual: 'gemma2:2b',
        literary: 'gemma2:2b',
      },
      'ru-en': {
        formal: 'translator-ru-en',
        technical: 'gemma2:2b',
        casual: 'gemma2:2b',
        literary: 'gemma2:2b',
      },
    };
    const autoModel = MODEL_MAP[direction.id]?.[style.id] || 'gemma2:2b';

    // Выбор режима ввода
    const inputMode = await select(
      "Режим ввода:",
      [
        { id: "text", name: "✏️ Ввести текст" },
        { id: "file", name: "📁 Выбрать файл" },
        { id: "clipboard", name: "📋 Из буфера обмена" },
      ],
      (m) => m.name,
    );

    if (!inputMode) return;

    let textToTranslate = "";
    let sourceFile: string | null = null;

    if (inputMode.id === "text") {
      const text = await input("Введите текст для перевода:");
      if (!text) return;
      textToTranslate = text;
    } else if (inputMode.id === "file") {
      const filePath = await filePicker("Выберите файл для перевода:", process.cwd());
      if (!filePath) return;
      sourceFile = filePath;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        console.log(`❌ Файл не найден: ${filePath}`);
        return;
      }
      textToTranslate = await file.text();
      console.log(`📁 Файл: ${filePath}`);
    } else if (inputMode.id === "clipboard") {
      textToTranslate = (await $`pbpaste`.text()).trim();
      if (!textToTranslate) {
        console.log("❌ Буфер обмена пуст");
        return;
      }
      console.log(`📋 Из буфера: ${textToTranslate.slice(0, 100)}${textToTranslate.length > 100 ? "..." : ""}`);
    }

    // Выбор режима вывода
    const outputMode = await select(
      "Режим вывода:",
      [
        { id: "stream", name: "📡 Стриминг (быстро)" },
        { id: "full", name: "📄 Полный ответ" },
        { id: "clipboard", name: "📋 В буфер обмена" },
      ],
      (m) => m.name,
    );

    if (!outputMode) return;

    console.log("🔄 Перевод...");
    console.log(`   Модель: ${autoModel}`);
    console.log(`   Стиль: ${style.id}`);
    console.log();

    try {
      // Импорт переводчика
      const { createTranslator } = await import("translate");
      const translator = createTranslator({
        direction: direction.id as "en-ru" | "ru-en",
        style: style.id as "formal" | "technical" | "casual" | "literary",
        model: autoModel,
        timeout: 180000, // 3 минуты на перевод
      });

      let result = "";

      if (outputMode.id === "stream") {
        // Стриминг с отображением в реальном времени
        console.log("--- Перевод ---");
        for await (const chunk of translator.translateStream(textToTranslate)) {
          process.stdout.write(chunk);
          result += chunk;
        }
        console.log("\n--- Конец перевода ---\n");
      } else {
        // Полный ответ
        result = await translator.translate(textToTranslate);
        console.log("\n--- Перевод ---");
        console.log(result);
        console.log("--- Конец перевода ---\n");
      }

      // Сохранение в .ai/ollama/
      const ollamaDir = join(AI_ROOT, ".ai/ollama");
      await $`mkdir -p ${ollamaDir}`;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const sourceName = sourceFile
        ? sourceFile.split("/").pop()?.replace(/\.[^.]+$/, "") || "source"
        : "text";
      const outputFile = join(ollamaDir, `translate-${sourceName}-${timestamp}.md`);

      const markdownContent = `# Перевод: ${sourceFile || "Текст из буфера/ввода"}

**Направление:** ${direction.id}
**Стиль:** ${style.id}
**Модель:** ${autoModel}
**Дата:** ${new Date().toISOString()}

---

## Оригинал

\`\`\`
${textToTranslate}
\`\`\`

---

## Перевод

\`\`\`
${result}
\`\`\`
`;

      await Bun.write(outputFile, markdownContent);
      console.log(`💾 Сохранено: ${outputFile}`);

      // Сохранение в буфер если нужно
      if (outputMode.id === "clipboard") {
        const cleaned = stripMarkdownWrapper(result);
        await $`echo ${cleaned} | pbcopy`;
        console.log("✅ Скопировано в буфер обмена");
      }
    } catch (error) {
      console.log("\n❌ Ошибка перевода:");
      if (error instanceof Error) {
        console.log(`   ${error.message}`);
        if (error.message.includes('Timeout')) {
          console.log("\n💡 Совет:");
          console.log("   - Модель долго отвечает. Попробуйте меньший текст");
          console.log("   - Или используйте более быструю модель (gemma2:2b)");
          console.log("   - Проверьте загрузку CPU: ollama ps");
        } else if (error.message.includes('404')) {
          console.log("\n💡 Совет:");
          console.log("   - Модель не найдена. Установите: ollama pull gemma2:2b");
        } else if (error.message.includes('ECONNREFUSED')) {
          console.log("\n💡 Совет:");
          console.log("   - Ollama не запущена. Выполните: ollama serve");
        }
      }
      console.log("\nНажмите любую клавишу...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      return;
    }

    // Предложение отправить в AI чат
    const sendToChat = await select(
      "Отправить в AI чат?",
      [
        { id: "no", name: "❌ Нет" },
        { id: "yes", name: "✅ Да" },
      ],
      (m) => m.name,
    );

    if (sendToChat?.id !== "yes") return;

    // AI Chat Integration
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

    // Копирование результата в буфер и вставка
    const cleaned = stripMarkdownWrapper(result);
    await $`echo ${cleaned} | pbcopy`;
    await pasteAndSend();

    const initialClipboard = await $`pbpaste`.text();
    const success = await Window.waitForClipboardChange(initialClipboard);

    if (success) {
      console.log("✅ Отправлено в чат! Возвращаюсь...");
      await Window.restoreApp(currentApp);
    } else {
      console.log("⚠️ Ожидание отменено.");
      await Window.restoreApp(currentApp);
    }
  },
};
