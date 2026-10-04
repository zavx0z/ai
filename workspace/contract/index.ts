/**
Параметры проверки пути для конкретной файловой операции.

@property [allowRoot] - Разрешает адресовать саму область для чтения метаданных и списка.

@property [missing] - Разрешает отсутствующее назначение после проверки существующих предков.

@property [finalSymlink] - Разрешает описать или удалить саму конечную ссылку, без перехода по ней.
*/
interface PathOptions {
  allowRoot?: boolean
  missing?: boolean
  finalSymlink?: boolean
}

/** Контракт области, которую назначает доверенный хост. */
export declare namespace AiWorkspace {
  /**
  Явная конфигурация хоста; не входит в аргументы агентных инструментов.

  @property directory - Абсолютная существующая директория. Относительное значение запрещено.
  */
  export interface Input {
    directory: string
  }
  /**
  Неизменяемый контекст исполнения; абсолютный путь остаётся у хоста.

  @property directory - Проверяет сохранность назначенной директории и возвращает её абсолютный путь.

  @property resolve - Разрешает относительный путь внутри области с запретом traversal, .git и symlink.

  @property relative - Представляет проверенный абсолютный путь относительно области.
  */
  export interface Output {
    directory(): string
    resolve(path: unknown, options?: PathOptions): string
    relative(path: string): string
  }
}
