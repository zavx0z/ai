/** Публичные формы возможности. */
export declare namespace Zavx0zAiFilesystemWrite {
  /**
  Атомарно заменяет содержимое существующего обычного файла после проверки параметров и пути.

  @property path - Путь обычного файла относительно рабочей области длиной не более 4096 байт; `.git`, обход родителей и переход через ссылки запрещены.

  @property content - Новое содержимое в UTF-8 или, при `encoding: "base64"`, каноническом Base64.
  После декодирования допускается не более 8388608 байт.
  Пустое содержимое допустимо.

  @property [encoding=utf8] - Интерпретация строки `content`.

  @property [expectedHash] - Ожидаемый SHA-256 текущего содержимого для проверки до замены.
  Принимается 64 строчных шестнадцатеричных символа. Несовпадение вызывает `CONFLICT`; проверка не является межпроцессной блокировкой.
  */
  export interface Input {
    path: string
    content: string
    encoding?: "utf8" | "base64"
    expectedHash?: string
  }

  /**
  Сведения о содержимом после успешной замены.

  @property path - Проверенный путь файла относительно рабочей области.

  @property bytes - Число записанных байтов.

  @property contentHash - SHA-256 записанных байтов в нижнем регистре.
  */
  export interface Output {
    path: string
    bytes: number
    contentHash: string
  }
}
