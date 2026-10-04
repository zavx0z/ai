import type {AiWorkspace} from "@ai/workspace"

/** Протокол HTTP-исполнения инструментов в контексте назначенной области. */
export declare namespace ServerRequest {
  /**
  Доверенные зависимости хоста; поля не принимаются из JSON команды модели.
  Хост создаёт обработчик для назначенного чата и передаёт запрос именно ему.

  @property workspace - Независимый контекст {@link AiWorkspace.Output} этой сессии.

  @property token - Bearer-токен длиной от 32 до 256 символов.

  @property [logger] - Получает requestId, метод, имя операции, статус и длительность;
  содержимое аргументов и токен не передаются. Ошибка logger не меняет выполненную операцию.
  */
  export interface Input {
    workspace: AiWorkspace.Output
    token: string
    logger?: (event: {requestId: string; method: string; name?: string; status: number; durationMs: number; errorCode?: string}) => void
  }

  /**
  Обработчик, закреплённый за одним контекстом.

  @property handle - Проверяет токен и HTTP-запрос. GET /tools возвращает
  `{result: [{name, description, arguments, result}]}` со схемами и описаниями
  только исполняемых инструментов. POST /tools принимает ровно `{name, arguments}`
  и возвращает `{result: значение}` либо `{error: {code, message, details?}}`.
  Старые node/action/input, структурные адреса и source-view не поддерживаются.
  requestId создаёт транспорт и передаёт в заголовке; модель его не задаёт.
  Listener, выбор чата и повтор исполнения не принадлежат этому обработчику.
  */
  export interface Output {
    handle(request: Request): Promise<Response>
  }
}
