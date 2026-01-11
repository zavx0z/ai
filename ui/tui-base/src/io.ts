export type KeyHandler = (key: string, normalized: string) => void | Promise<void>;

export class TerminalIO {
  private static isRaw = false;

  static setRawMode(mode: boolean): void {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(mode);
      this.isRaw = mode;
    }
    if (mode) {
      process.stdin.setEncoding("utf8");
      process.stdin.resume();
    } else {
      process.stdin.pause();
    }
  }

  /**
   * Выполнить действие в raw режиме и вернуть терминал в исходное состояние
   */
  static async withRawMode<T>(action: () => Promise<T>): Promise<T> {
    try {
      this.setRawMode(true);
      return await action();
    } finally {
      this.setRawMode(false);
    }
  }

  /**
   * Подписка на нажатия клавиш
   */
  static onKey(handler: KeyHandler): () => void {
    const wrapper = (chunk: Buffer) => {
        const key = chunk.toString();
        // Lazy import to avoid circular dep issues if any, 
        // but here we just need normalization logic.
        // We assume the consumer will pass normalizing logic if needed,
        // or we just pass raw key. 
        // For compatibility with tree-explorer, let's normalize here if we can import KeyMapper.
        // But io.ts should be generic. Let's just pass key.
        handler(key, key); 
    };
    
    process.stdin.on("data", wrapper);
    
    // Возвращаем функцию отписки
    return () => process.stdin.off("data", wrapper);
  }
}