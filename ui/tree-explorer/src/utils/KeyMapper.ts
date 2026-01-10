import type { KeyMapping } from "../types/types"

export class KeyMapper {
  private static readonly RUSSIAN_TO_ENGLISH: KeyMapping = {
    ф: "a",
    и: "b",
    с: "c",
    в: "d",
    у: "e",
    а: "f",
    п: "g",
    р: "h",
    ш: "i",
    щ: "j",
    к: "k",
    ы: "l",
    м: "m",
    т: "n",
    ь: "o",
    б: "p",
    ю: "q",
    я: "r",
    д: "s",
    з: "t",
    й: "u",
    ц: "v",
    ж: "w",
    х: "x",
    ч: "y",
    э: "z",
    н: "y",
    г: "u",
    е: "t",
    о: "j",
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
      "\u001b[A", // Стрелка вверх
      "\u001b[B", // Стрелка вниз
      "\u001b[C", // Стрелка вправо
      "\u001b[D", // Стрелка влево
      "\u0003", // Ctrl+C
      "\r", // Enter
      " ", // Пробел
      "\x7f", // Backspace
      "\u001b", // Escape
    ]
    return specialKeys.includes(key)
  }

  static getKeyDescription(key: string): string {
    const descriptions: KeyMapping = {
      "\u001b[A": "Стрелка вверх",
      "\u001b[B": "Стрелка вниз",
      "\u001b[C": "Стрелка вправо",
      "\u001b[D": "Стрелка влево",
      "\u0003": "Ctrl+C",
      "\r": "Enter",
      " ": "Пробел",
      "\x7f": "Backspace",
      "\u001b": "Escape",
    }
    return descriptions[key] || key
  }
}
