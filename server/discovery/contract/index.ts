/** Исходный каталог пакетов; описание не является исполнением инструмента. */
export declare namespace ServerDiscovery {
  /**
  Доверенный источник каталога и уже зарегистрированные bindings.

  @property repositoryRoot - Абсолютный путь к checkout, из которого читается метаданные.

  @property runnable - Адреса функций, подключённых хостом; каждый обязан существовать в каталоге.
  */
  export interface Input {
    repositoryRoot: string
    runnable: ReadonlySet<string>
  }

  /**
  Доступ к описаниям исходников, без их импорта или исполнения.

  @property describe - Возвращает обзор выбранного адреса либо TypeScript исходник
  contract/scenarios. Без адреса описывает Repo, без view выбирает overview.
  Неизвестный адрес или отсутствующая форма дают ToolError.

  @property has - Проверяет наличие точного адреса в прочитанном составе пакетов.
  */
  export interface Output {
    describe(node?: string, view?: string): unknown
    has(node: string): boolean
  }
}
