import type {FilesystemRead} from "@filesystem/read"

/** Публичные формы возможности. */
export declare namespace FilesystemReadMany {
  /**
  Последовательно читает несколько файлов в общем бюджете байтов.

  @property paths - Упорядоченный список относительных путей длиной не более 4096 байт каждый; от `1` до `50` непустых строк.
  Обход родителей, `.git` и переходы по ссылкам запрещены.
  Ошибка отдельного пути становится ошибкой его записи в результате.

  @property [encoding=utf8] - Кодировка содержимого каждого файла.

  @property [maxBytesPerFile=65536] - Максимум байтов для одного файла в диапазоне `[1..8388608]`.
  Фактический предел также ограничивается остатком общего бюджета.

  @property [maxTotalBytes=2097152] - Общий бюджет фактически прочитанных байтов в диапазоне `[1..8388608]`.
  После его исчерпания оставшиеся пути получают ошибку `LIMIT_EXCEEDED`.
  */
  export interface Input {
    paths: string[]
    encoding?: "utf8" | "base64"
    maxBytesPerFile?: number
    maxTotalBytes?: number
  }

  /**
  Результаты чтения в исходном порядке, включая ошибки отдельных путей.

  @property files - Для каждого входного пути содержит результат чтения либо нормализованные код и сообщение ошибки.

  @property bytesRead - Сумма фактически прочитанных байтов.

  @property remainingBytes - Часть общего бюджета, не израсходованная при обработке списка.

  @property truncated - `true`, если хотя бы один файл прочитан не полностью либо завершился ошибкой.
  */
  export interface Output {
    files: Array<{path: string; result: FilesystemRead.Output} | {path: string; error: {code: string; message: string}}>
    bytesRead: number
    remainingBytes: number
    truncated: boolean
  }
}
