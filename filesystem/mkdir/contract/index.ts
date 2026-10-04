/** Публичные формы возможности. */
export declare namespace AiFilesystemMkdir {
  /**
  Создаёт каталог внутри назначенной рабочей области после проверки пути.

  @property path - Путь каталога относительно рабочей области длиной не более 4096 байт; сам корень, `.git` и переход через ссылки запрещены.

  @property [recursive=false] - Создать отсутствующие родительские каталоги.
  */
  export interface Input {
    path: string
    recursive?: boolean
  }

  /**
  Состояние целевого каталога после успешного вызова.

  @property path - Проверенный путь целевого каталога относительно рабочей области.

  @property created - `true`, если каталог отсутствовал до вызова и был создан им.
  */
  export interface Output {
    path: string
    created: boolean
  }
}
