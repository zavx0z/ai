import { focusWindow } from "./common"

/**
 * Переключает фокус на чат
 */
export async function focus() {
  await focusWindow("ChatGPT")
}

// TODO: Implement GPT specific methods
export const name = "gpt"