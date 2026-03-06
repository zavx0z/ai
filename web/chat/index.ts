export * from "./common";
export { stripMarkdownWrapper } from "./utils";

import * as Deepseek from "./deepseek";
import * as Gemini from "./gemini";
import * as Qwen from "./qwen";
import * as Alice from "./alice";
import * as Gpt from "./gpt";

export { Deepseek, Gemini, Qwen, Alice, Gpt };
export { getCleanClipboard } from "./common";

/**
 * Переключает фокус на указанный чат
 */
export async function focusChat(name: string) {
  const map: Record<string, { focus: () => Promise<void> }> = {
    alice: Alice,
    deepseek: Deepseek,
    gemini: Gemini,
    gpt: Gpt,
    qwen: Qwen,
  };

  const module = map[name.toLowerCase()];
  if (module) {
    await module.focus();
  }
}
