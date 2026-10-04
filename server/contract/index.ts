/** Конфигурация и жизненный цикл самостоятельного HTTP-хоста. */
export declare namespace AiServer {
  /**
  Доверенная конфигурация до запуска listener.

  @property directory - Существующая абсолютная рабочая директория, назначенная хостом.

  @property token - Bearer-токен длиной от 32 до 256 символов для всех запросов.

  @property [hostname=127.0.0.1] - Интерфейс прослушивания.

  @property [port=8787] - Целое от 0 до 65535; 0 позволяет ОС выбрать свободный порт.

  @property [log=true] - Запись безопасных метаданных запросов в stderr.
  */
  export interface Input {
    directory: string
    token: string
    hostname?: string
    port?: number
    log?: boolean
  }

  /**
  Запущенный HTTP-хост. Потребитель освобождает listener через close.

  @property url - Фактический адрес /tools после успешного прослушивания.

  @property close - Асинхронное закрытие listener, без изменения рабочей директории.
  */
  export interface Output {
    url: string
    close(): Promise<void>
  }
}
