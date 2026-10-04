/**
Единственная прикладная команда потребителя. Поля корреляции и выбора области
относятся к хосту и транспорту, поэтому не входят в JSON команды.

@property name - Точное имя исполняемой операции из GET /tools, например filesystem.list.

@property arguments - Обязательный объект аргументов инструмента; пустой объект передаётся явно.
Неизвестные поля отклоняет сам инструмент до побочного эффекта.
*/
export interface Command {
  name: string
  arguments: Record<string, unknown>
}

/**
Прикладной ответ одного вызова. Корреляция остаётся в заголовке x-request-id и журнале.

@property result - Результат операции без транспортных полей. GET /tools возвращает здесь массив описаний.

@property error - Безопасный отказ с кодом, сообщением и необязательными подробностями.
*/
export type Reply = {result: unknown} | {error: {code: string; message: string; details?: unknown}}
