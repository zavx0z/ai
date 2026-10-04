/** Публичные формы возможности. */
export declare namespace AiFilesystemRemove {
  /**
  Удаляет запись по относительному пути; конечная символическая ссылка удаляется как ссылка.

  @property path - Путь записи внутри рабочей области длиной не более 4096 байт; обход родителей и `.git` запрещены. Сам корень удалить нельзя.

  @property [recursive=false] - Рекурсивно удалить содержимое каталога; без флага каталог должен быть пустым.
  */
  export interface Input {
    path: string
    recursive?: boolean
  }

  /**
  Подтверждение успешного удаления одной записи.

  @property path - Относительный путь удалённой записи.

  */
  export interface Output {
    path: string
    removed: true
  }
}
