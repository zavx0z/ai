import type {AiFilesystemAccess} from "@ai-filesystem/access"

/** Публичные формы возможности. */
export declare namespace AiFilesystemStat {
  /**
  Метаданные записи внутри назначенной области без перехода по конечной символической ссылке.

  @property path - Путь относительно рабочей области; `.` обозначает сам корень.
  Родительский обход, `.git` и переход по ссылкам запрещены; конечную ссылку можно описать как отдельную запись. Путь ограничен 4096 байтами.
  */
  export interface Input {
    path: string
  }

  /**
  Метаданные одного пути без разыменования конечной ссылки.

  @property entry - Описание самой записи, включая тип `symlink`, если конечный путь является ссылкой.
  */
  export interface Output {
    entry: AiFilesystemAccess.Output
  }
}
