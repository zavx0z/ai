/** Публичные формы возможности. */
export declare namespace FilesystemCreate {
  /**
  Создаёт новый файл с исключительным доступом, не перезаписывая существующий путь.

  @property path - Путь нового файла относительно рабочей области длиной не более 4096 байт; `.git`, обход родителей и переход через ссылки запрещены.

  @property content - Новое содержимое в UTF-8 или, при `encoding: "base64"`, каноническом Base64.
  После декодирования допускается не более 8388608 байт.
  Пустое содержимое допустимо.

  @property [encoding=utf8] - Интерпретация строки `content`.

  @property [createParents=false] - Создать отсутствующие родительские каталоги перед файлом.
  При последующей ошибке записи уже созданные каталоги могут остаться.
  */
  export interface Input {
    path: string
    content: string
    encoding?: "utf8" | "base64"
    createParents?: boolean
  }

  /**
  Сведения о созданном файле.

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
