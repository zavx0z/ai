export const name = "алиса"
/**
 * Открывает новый чат
 */
import { focusWindow } from "./common"

/**
 * Переключает фокус на чат
 *
 * @summary
 * По заголовку не возможно.
 * В заголовке нет имени сервиса, только название диалога.
 * // ToDo: фокус по id окна
 */
export async function focus() {
  await focusWindow(name)
}

export async function openNewChat() {
  await Bun.sleep(200)
}
