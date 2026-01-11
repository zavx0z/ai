import { KeyMapper as BaseKeyMapper, KeyCode } from "tui-base"
import type { KeyMapping } from "../types/types"

export class KeyMapper {
  // Using Base KeyMapper for conversion
  static convertRussianKey(key: string): string {
    return BaseKeyMapper.normalize(key)
  }

  static isSpecialKey(key: string): boolean {
    const specialKeys = [
      KeyCode.UP,
      KeyCode.DOWN,
      KeyCode.RIGHT,
      KeyCode.LEFT,
      KeyCode.CTRL_C,
      KeyCode.ENTER,
      KeyCode.SPACE,
      KeyCode.BACKSPACE,
      KeyCode.ESC,
    ]
    return specialKeys.includes(key as any)
  }

  static getKeyDescription(key: string): string {
    const descriptions: Record<string, string> = {
      [KeyCode.UP]: "Up",
      [KeyCode.DOWN]: "Down",
      [KeyCode.RIGHT]: "Right",
      [KeyCode.LEFT]: "Left",
      [KeyCode.CTRL_C]: "Ctrl+C",
      [KeyCode.ENTER]: "Enter",
      [KeyCode.SPACE]: "Space",
      [KeyCode.BACKSPACE]: "Backspace",
      [KeyCode.ESC]: "Escape",
    }
    return descriptions[key] || key
  }
}