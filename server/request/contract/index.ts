import type {AiWorkspace} from "@ai/workspace"

/** Протокол связывания HTTP-запросов с заранее назначенной областью. */
export declare namespace ServerRequest {
  /**
  Доверенные зависимости хоста; не принимаются из JSON удалённого вызова.

  @property workspace - Независимый контекст {@link AiWorkspace.Output} этой сессии.

  @property token - Bearer-токен длиной от 32 до 256 символов.

  @property repositoryRoot - Checkout исходников каталога, отдельный от рабочей области.

  @property [logger] - Получает метаданные после обработки запроса, без токена и аргументов.
  Ошибка logger не изменяет уже завершённый результат операции.
  */
  export interface Input {
    workspace: AiWorkspace.Output
    token: string
    repositoryRoot: string
    logger?: (event: {requestId: string; method: string; node?: string; action?: string; status: number; durationMs: number; errorCode?: string}) => void
  }

  /**
  Обработчик, закреплённый за одним контекстом.

  @property handle - Проверяет авторизацию и JSON-оболочку, описывает узел либо
  исполняет явное action:run. Возвращает Response; ожидаемые отказы нормализуются
  в JSON без абсолютных путей ОС. Не запускает listener и не выполняет повторов.
  */
  export interface Output {
    handle(request: Request): Promise<Response>
  }
}
