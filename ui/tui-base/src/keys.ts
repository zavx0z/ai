export const KeyCode = {
  UP: "\u001b[A",
  DOWN: "\u001b[B",
  RIGHT: "\u001b[C",
  LEFT: "\u001b[D",
  ENTER: "\r",
  ESC: "\u001b",
  BACKSPACE: "\x7f",
  SPACE: " ",
  CTRL_C: "\u0003",
  TAB: "\t",
} as const;

export class KeyMapper {
  private static readonly RU_TO_EN: Record<string, string> = {
    // Row 1
    "й": "q", "ц": "w", "у": "e", "к": "r", "е": "t", "н": "y", "г": "u", "ш": "i", "щ": "o", "з": "p", "х": "[", "ъ": "]",
    // Row 2
    "ф": "a", "ы": "s", "в": "d", "а": "f", "п": "g", "р": "h", "о": "j", "л": "k", "д": "l", "ж": ";", "э": "'",
    // Row 3
    "я": "z", "ч": "x", "с": "c", "м": "v", "и": "b", "т": "n", "ь": "m", "б": ",", "ю": ".", ".": "/"
  };

  /**
   * Возвращает нормализованный код клавиши (английский вариант для кириллицы)
   */
  static normalize(key: string): string {
    if (key.length === 1) {
      const lowerKey = key.toLowerCase();
      return this.RU_TO_EN[lowerKey] || lowerKey;
    }
    return key;
  }

  /**
   * Проверка на навигационные клавиши (Vim style + Arrows)
   */
  static isUp(key: string): boolean {
    const norm = this.normalize(key);
    return key === KeyCode.UP || norm === "k";
  }

  static isDown(key: string): boolean {
    const norm = this.normalize(key);
    return key === KeyCode.DOWN || norm === "j";
  }

  static isRight(key: string): boolean {
    const norm = this.normalize(key);
    return key === KeyCode.RIGHT || norm === "l";
  }

  static isLeft(key: string): boolean {
    const norm = this.normalize(key);
    return key === KeyCode.LEFT || norm === "h";
  }

  static isEnter(key: string): boolean {
    const norm = this.normalize(key);
    return key === KeyCode.ENTER || norm === "l";
  }
  
  static isBack(key: string): boolean {
     const norm = this.normalize(key);
     return key === KeyCode.ESC || key === KeyCode.LEFT || norm === "h";
  }
}