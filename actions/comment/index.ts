import ts from "typescript"
import type { CommentMetadata, RemovalResult, RemovalOptions, MetadataFile, CommentType } from "./index.t"

export class CommentRemover {
  /**
   * Собирает все комментарии из исходного кода
   */
  static collectComments(sourceCode: string, fileName: string = "source.ts"): CommentMetadata[] {
    const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true)

    const metadata: CommentMetadata[] = []
    const fullText = sourceFile.getFullText()

    // Функция для определения типа комментария
    const getCommentType = (kind: ts.SyntaxKind, text: string): CommentType => {
      if (kind === ts.SyntaxKind.SingleLineCommentTrivia) {
        return "single-line"
      } else if (text.startsWith("/**")) {
        return "jsdoc"
      } else {
        return "multi-line"
      }
    }

    // Функция для сбора комментариев
    const visit = (node: ts.Node) => {
      const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart())

      if (commentRanges) {
        for (const range of commentRanges) {
          const commentText = fullText.substring(range.pos, range.end)
          const linesBeforeNode = fullText.substring(0, range.pos).split("\n")
          const lineNumber = linesBeforeNode.length

          metadata.push({
            id: this.generateId(range.pos, range.end),
            text: commentText,
            type: getCommentType(range.kind, commentText),
            start: range.pos,
            end: range.end,
            line: lineNumber,
            attachedTo: {
              kind: ts.SyntaxKind[node.kind],
              name: (node as any).name?.text || (node as any).getName?.(),
            },
          })
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    // Сортируем по позиции в коде
    return metadata.sort((a, b) => a.start - b.start)
  }

  /**
   * Удаляет комментарии из исходного кода
   */
  static removeComments(sourceCode: string, metadata: CommentMetadata[], options: RemovalOptions = {}): string {
    const { preserveNewlines = true, removeOnly = [], keepOnly = [], includeShebang = true } = options

    // Фильтруем комментарии по опциям
    let filteredMetadata = metadata

    if (removeOnly.length > 0) {
      filteredMetadata = filteredMetadata.filter((c) => !removeOnly.includes(c.type))
    }

    if (keepOnly.length > 0) {
      filteredMetadata = filteredMetadata.filter((c) => keepOnly.includes(c.type))
    }

    // Сохраняем shebang если нужно
    let shebang = ""
    let codeWithoutShebang = sourceCode

    if (includeShebang && sourceCode.startsWith("#!")) {
      const firstNewline = sourceCode.indexOf("\n")
      if (firstNewline !== -1) {
        shebang = sourceCode.substring(0, firstNewline + 1)
        codeWithoutShebang = sourceCode.substring(firstNewline + 1)
        // Корректируем позиции в метаданных
        filteredMetadata = filteredMetadata
          .map((comment) => ({
            ...comment,
            start: comment.start - firstNewline - 1,
            end: comment.end - firstNewline - 1,
          }))
          .filter((comment) => comment.start >= 0)
      }
    }

    if (preserveNewlines) {
      return shebang + this.removeCommentsPreserveNewlines(codeWithoutShebang, filteredMetadata)
    } else {
      return shebang + this.removeCommentsCompact(codeWithoutShebang, filteredMetadata)
    }
  }

  /**
   * Удаляет комментарии, оставляя пустые строки
   */
  private static removeCommentsPreserveNewlines(sourceCode: string, metadata: CommentMetadata[]): string {
    const lines = sourceCode.split("\n")
    const lineComments = new Map<number, string[]>()

    // Группируем комментарии по строкам
    for (const comment of metadata) {
      const lineIndex = comment.line - 1
      if (!lineComments.has(lineIndex)) {
        lineComments.set(lineIndex, [])
      }
      lineComments.get(lineIndex)!.push(comment.text)
    }

    // Обрабатываем каждую строку
    const processedLines = lines.map((line, lineIndex) => {
      if (!lineComments.has(lineIndex)) {
        return line
      }

      const comments = lineComments.get(lineIndex)!
      let result = line

      // Удаляем комментарии с конца строки к началу
      for (const commentText of comments.sort((a, b) => b.length - a.length)) {
        const commentIndex = result.indexOf(commentText)
        if (commentIndex !== -1) {
          result = result.substring(0, commentIndex) + result.substring(commentIndex + commentText.length)
        }
      }

      // Если строка стала пустой или содержит только пробелы, оставляем пустую строку
      return result.trim().length === 0 ? "" : result
    })

    return processedLines.join("\n")
  }

  /**
   * Удаляет комментарии, сжимая код
   */
  private static removeCommentsCompact(sourceCode: string, metadata: CommentMetadata[]): string {
    // Сортируем комментарии по убыванию позиции начала для безопасного удаления
    const sortedMetadata = [...metadata].sort((a, b) => b.start - a.start)
    let result = sourceCode

    for (const comment of sortedMetadata) {
      // Удаляем комментарий по точным позициям
      result = result.slice(0, comment.start) + result.slice(comment.end)
    }

    // Удаляем все пустые строки для компактного режима
    const lines = result.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim() !== '')
    return nonEmptyLines.join('\n')
  }

  /**
   * Восстанавливает комментарии в очищенный код
   */
  static restoreComments(cleanedCode: string, metadata: CommentMetadata[]): string {
    // Сортируем по возрастанию позиции
    const sortedMetadata = [...metadata].sort((a, b) => a.start - b.start)
    let result = cleanedCode
    let offset = 0

    for (const comment of sortedMetadata) {
      const insertPosition = comment.start + offset
      result = result.slice(0, insertPosition) + comment.text + result.slice(insertPosition)
      offset += comment.text.length
    }

    return result
  }

  /**
   * Генерирует полный результат удаления
   */
  static async cleanCode(
    sourceCode: string,
    fileName: string = "source.ts",
    options: RemovalOptions = {}
  ): Promise<RemovalResult> {
    const metadata = this.collectComments(sourceCode, fileName)

    const originalHash = await this.hashString(sourceCode)
    const cleanedCode = this.removeComments(sourceCode, metadata, options)
    const cleanedHash = await this.hashString(cleanedCode)

    return {
      cleanedCode,
      metadata,
      sourceFile: fileName,
      originalHash,
      cleanedHash,
    }
  }

  /**
   * Сохраняет очищенный код и метаданные в файлы
   */
  static async saveCleanedCode(
    sourcePath: string,
    outputPath?: string,
    metadataPath?: string,
    options: RemovalOptions = {}
  ): Promise<MetadataFile> {
    const sourceCode = await Bun.file(sourcePath).text()
    const outputFile = outputPath || sourcePath.replace(/\.(ts|js|tsx|jsx)$/, ".clean.$1")
    const metaFile = metadataPath || sourcePath.replace(/\.(ts|js|tsx|jsx)$/, ".comments.json")

    const result = await this.cleanCode(sourceCode, sourcePath, options)

    // Сохраняем очищенный код
    await Bun.write(outputFile, result.cleanedCode)

    // Создаем файл метаданных
    const metadata: MetadataFile = {
      sourceFile: sourcePath,
      cleanedFile: outputFile,
      comments: result.metadata,
      timestamp: new Date().toISOString(),
      originalHash: result.originalHash!,
      cleanedHash: result.cleanedHash!,
    }

    await Bun.write(metaFile, JSON.stringify(metadata, null, 2))

    return metadata
  }

  /**
   * Восстанавливает код из очищенного файла и метаданных
   */
  static async restoreFromMetadata(cleanedFilePath: string, metadataFilePath: string): Promise<string> {
    const cleanedCode = await Bun.file(cleanedFilePath).text()
    const metadataFile: MetadataFile = JSON.parse(await Bun.file(metadataFilePath).text())

    // Валидация хэшей
    const currentHash = await this.hashString(cleanedCode)
    if (currentHash !== metadataFile.cleanedHash) {
      console.warn("⚠️  Хэш очищенного файла не совпадает с сохраненным. Возможно файл был изменен.")
    }

    return this.restoreComments(cleanedCode, metadataFile.comments)
  }

  /**
   * Генерирует уникальный ID для комментария
   */
  private static generateId(start: number, end: number): string {
    return `comment_${start}_${end}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Создает хэш строки
   */
  private static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  /**
   * Получает статистику по комментариям
   */
  static getCommentStats(metadata: CommentMetadata[]): {
    total: number
    byType: Record<CommentType, number>
    linesWithComments: number
    totalCommentLength: number
  } {
    const byType: Record<CommentType, number> = {
      "single-line": 0,
      "multi-line": 0,
      jsdoc: 0,
    }

    const uniqueLines = new Set<number>()
    let totalLength = 0

    for (const comment of metadata) {
      byType[comment.type]++
      uniqueLines.add(comment.line)
      totalLength += comment.text.length
    }

    return {
      total: metadata.length,
      byType,
      linesWithComments: uniqueLines.size,
      totalCommentLength: totalLength,
    }
  }
}

// Экспорт вспомогательных функций
export type { RemovalOptions, CommentType }
