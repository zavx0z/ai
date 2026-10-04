import type {AiFilesystemAccess} from "@zavx0z/ai-filesystem-access"

/** Публичные формы возможности. */
export declare namespace AiFilesystemList {
  /**
  Перечисляет записи каталога, не обходя символические ссылки и `.git`.

  @property [path=.] - Каталог относительно рабочей области длиной не более 4096 байт.
  `.git`, обход родителей и переход по ссылкам запрещены.
  Конечная символическая ссылка не принимается как каталог.

  @property [recursive=false] - Включает обход вложенных каталогов.

  @property [maxDepth=3] - Максимальная глубина рекурсии в диапазоне `[1..10]`.
  Корневой каталог обхода имеет глубину `1`.

  @property [maxEntries=1000] - Максимум возвращаемых записей в диапазоне `[1..5000]`.
  */
  export interface Input {
    path?: string
    recursive?: boolean
    maxDepth?: number
    maxEntries?: number
  }

  /**
  Ограниченный снимок записей выбранного каталога.

  @property path - Относительный путь обойдённого каталога.

  @property entries - Найденные записи, отсортированные по относительному пути.

  @property truncated - `true`, когда результат неполон из-за предела глубины или количества записей.

  @property depthLimited - `true`, когда рекурсия остановилась на предельной глубине.
  */
  export interface Output {
    path: string
    entries: AiFilesystemAccess.Output[]
    truncated: boolean
    depthLimited: boolean
  }
}
