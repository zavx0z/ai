import { KeyCode, TerminalIO } from "tui-base"

export const Keys = {
  UP: KeyCode.UP,
  DOWN: KeyCode.DOWN,
  ENTER: KeyCode.ENTER,
  CTRL_C: KeyCode.CTRL_C,
  ESC: KeyCode.ESC
}

export function withRawMode<T>(callback: () => Promise<T>): Promise<T> {
  return TerminalIO.withRawMode(callback)
}