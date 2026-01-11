export class Ansi {
  // Reset & Modifiers
  static readonly RESET = "\x1b[0m";
  static readonly BOLD = "\x1b[1m";
  static readonly DIM = "\x1b[2m";

  // Colors (Foreground)
  static readonly BLACK = "\x1b[30m";
  static readonly RED = "\x1b[31m";
  static readonly GREEN = "\x1b[32m";
  static readonly YELLOW = "\x1b[33m";
  static readonly BLUE = "\x1b[34m";
  static readonly MAGENTA = "\x1b[35m";
  static readonly CYAN = "\x1b[36m";
  static readonly WHITE = "\x1b[37m";
  static readonly GRAY = "\x1b[90m";

  // Backgrounds
  static readonly BG_SELECTED = "\x1b[48;5;238m";
  static readonly BG_CURSOR = "\x1b[48;5;240m";

  // Cursor & Screen Control
  static readonly CLEAR_SCREEN = "\x1b[2J\x1b[H";
  static readonly HIDE_CURSOR = "\x1b[?25l";
  static readonly SHOW_CURSOR = "\x1b[?25h";

  // Helpers
  static color(text: string, colorCode: string): string {
    return `${colorCode}${text}${this.RESET}`;
  }

  static bold(text: string): string {
    return `${this.BOLD}${text}${this.RESET}`;
  }

  static clear(): void {
    process.stdout.write(this.CLEAR_SCREEN);
  }
}