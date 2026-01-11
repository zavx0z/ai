import type { KeyMapping } from "../types/types"

export class KeyMapper {
  // Standard Layout Mapping (QWERTY <-> ЙЦУКЕН)
  private static readonly RUSSIAN_TO_ENGLISH: KeyMapping = {
    // Row 1
    "й": "q", "ц": "w", "у": "e", "к": "r", "е": "t", "н": "y", "г": "u", "ш": "i", "щ": "o", "з": "p", "х": "[", "ъ": "]",
    // Row 2
    "ф": "a", "ы": "s", "в": "d", "а": "f", "п": "g", "р": "h", "о": "j", "л": "k", "д": "l", "ж": ";", "э": "'",
    // Row 3
    "я": "z", "ч": "x", "с": "c", "м": "v", "и": "b", "т": "n", "ь": "m", "б": ",", "ю": ".", ".": "/"
  }

  static convertRussianKey(key: string): string {
    if (key.length === 1) {
      const lowerKey = key.toLowerCase()
      return this.RUSSIAN_TO_ENGLISH[lowerKey] || lowerKey
    }
    return key
  }

  static isSpecialKey(key: string): boolean {
    const specialKeys = [
      "\u001b[A", // Up Arrow
      "\u001b[B", // Down Arrow
      "\u001b[C", // Right Arrow
      "\u001b[D", // Left Arrow
      "\u0003", // Ctrl+C
      "\r", // Enter
      " ", // Space
      "\x7f", // Backspace
      "\u001b", // Escape
    ]
    return specialKeys.includes(key)
  }

  static getKeyDescription(key: string): string {
    const descriptions: KeyMapping = {
      "\u001b[A": "Up",
      "\u001b[B": "Down",
      "\u001b[C": "Right",
      "\u001b[D": "Left",
      "\u0003": "Ctrl+C",
      "\r": "Enter",
      " ": "Space",
      "\x7f": "Backspace",
      "\u001b": "Escape",
    }
    return descriptions[key] || key
  }
}
