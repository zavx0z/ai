/** Публичные формы возможности. */
export declare namespace Zavx0zAiFilesystemRead {
  /**
  Читает участок обычного файла; исполнитель проверяет параметры и путь до чтения.

  @property path - Путь обычного файла относительно рабочей области.
  Обход родителей, `.git` и переход через конечную или родительскую ссылку запрещены; длина не более 4096 байт.

  @property [offset=0] - Смещение начала чтения в байтах; безопасное целое от `0` до `Number.MAX_SAFE_INTEGER`.

  @property [maxBytes=65536] - Максимум байтов одного ответа в диапазоне `[1..8388608]`.
  Ограничение применяется до декодирования текста.

  @property [encoding=utf8] - Кодировка представления байтов; `base64` сохраняет произвольные байты и диапазоны, разделяющие UTF-8 символ.
  */
  export interface Input {
    path: string
    offset?: number
    maxBytes?: number
    encoding?: "utf8" | "base64"
  }

  /**
  Фактически прочитанный участок файла и его связь с исходным размером.

  @property path - Проверенный путь относительно рабочей области.

  @property content - Прочитанный участок в выбранной кодировке.

  @property encoding - Кодировка поля `content`.

  @property offset - Фактическое смещение начала участка в байтах.

  @property bytesRead - Число фактически прочитанных байтов до декодирования.

  @property size - Размер файла на момент чтения, в байтах.

  @property truncated - `true`, если после участка в файле оставались байты.

  @property contentHash - SHA-256 всего содержимого, если ответ содержит файл целиком; иначе `null`.
  */
  export interface Output {
    path: string
    content: string
    encoding: "utf8" | "base64"
    offset: number
    bytesRead: number
    size: number
    truncated: boolean
    contentHash: string | null
  }
}
