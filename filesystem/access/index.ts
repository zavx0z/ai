/** Общие гарантии чтения и атомарной замены обычных файлов.
 @packageDocumentation
 */
import {createHash, randomUUID} from "node:crypto"
import {constants, openSync, closeSync, fstatSync, fchmodSync, readSync, lstatSync, writeFileSync, renameSync, unlinkSync} from "node:fs"
import {dirname, join, relative, sep} from "node:path"
import ToolError from "@tech/failure"

import type {FilesystemAccess} from "./contract/index.ts"
export type {FilesystemAccess} from "./contract/index.ts"

const MAX_BYTES = 8 * 1024 * 1024

/** Операции над обычным файлом с ограничением байтов и проверкой конфликтов. */
const access = {
  MAX_BYTES,
  /**
  Читает lstat записи, сохраняя конечную символическую ссылку как самостоятельный объект.

  @param root - Проверенная абсолютная директория назначенной области.

  @param path - Проверенный абсолютный путь записи внутри этой области.

  @returns Относительный путь, вид, размер, режим доступа и время изменения записи.
  */
  metadata(root: string, path: string): FilesystemAccess.Output {
    const stat = lstatSync(path)
    return {path: relative(root, path).split(sep).join("/") || ".", type: stat.isSymbolicLink() ? "symlink" : stat.isFile() ? "file" : stat.isDirectory() ? "directory" : "other",
      size: stat.size, mode: stat.mode & 0o777, modifiedAt: stat.mtime.toISOString()}
  },

  /**
  Вычисляет SHA-256 фактических байтов для проверки содержимого перед записью.

  @param data - Байты без текстового перекодирования.

  @returns Строчный шестнадцатеричный SHA-256.
  */
  digest(data: Uint8Array): string {
    return createHash("sha256").update(data).digest("hex")
  },

  /**
  Читает ограниченный участок обычного файла через дескриптор без перехода по конечной ссылке.
  Дескриптор освобождается при любом исходе.

  @param path - Проверенный абсолютный путь обычного файла.

  @param offset - Неотрицательное целое смещение в байтах, проверенное вызывающей операцией.

  @param maxBytes - Положительный предел чтения в байтах, проверенный вызывающей операцией.

  @returns Фактически прочитанные байты и полный размер по открытому дескриптору.

  @throws ToolError, если путь или дескриптор не является обычным файлом.
  */
  readChunk(path: string, offset: number, maxBytes: number): {data: Buffer; size: number} {
    if (!lstatSync(path).isFile()) throw new ToolError("INVALID_PATH_TYPE", "Path must be a regular file")
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const stat = fstatSync(fd)
      if (!stat.isFile()) throw new ToolError("INVALID_PATH_TYPE", "Path must be a regular file")
      const buffer = Buffer.alloc(Math.max(0, Math.min(maxBytes, stat.size - offset)))
      let bytes = 0
      while (bytes < buffer.length) {
        const count = readSync(fd, buffer, bytes, buffer.length - bytes, offset + bytes)
        if (count === 0) break
        bytes += count
      }
      return {data: buffer.subarray(0, bytes), size: stat.size}
    } finally { closeSync(fd) }
  },

  /**
  Читает весь обычный файл в пределах бюджета изменения и проверяет полноту чтения.

  @param path - Проверенный абсолютный путь исходного файла.

  @returns Все байты файла, не более 8 MiB.

  @throws ToolError при превышении бюджета или изменении размера во время чтения.
  */
  readWhole(path: string): Buffer {
    const {data, size} = access.readChunk(path, 0, MAX_BYTES)
    if (size > MAX_BYTES) throw new ToolError("LIMIT_EXCEEDED", "File exceeds the mutation byte limit", 413)
    if (data.length !== size) throw new ToolError("CONFLICT", "File changed while being read", 409)
    return data
  },

  /**
  Преобразует содержимое в байты до побочного эффекта, проверяя каноничность Base64 и размер.

  @param content - Текст UTF-8 либо каноническая Base64-строка.

  @param encoding - Уже проверенный способ декодирования utf8 или base64.

  @returns Буфер не более 8 MiB.

  @throws ToolError при неверной Base64-форме или превышении бюджета.
  */
  decode(content: string, encoding: "utf8" | "base64"): Buffer {
    if (Buffer.byteLength(content, "utf8") > MAX_BYTES * 1.4) throw new ToolError("LIMIT_EXCEEDED", "Content exceeds the byte limit", 413)
    if (encoding === "base64" && (content.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content))) {
      throw new ToolError("INVALID_INPUT", "Content must be canonical base64")
    }
    const data = Buffer.from(content, encoding)
    if (encoding === "base64" && data.toString("base64") !== content) throw new ToolError("INVALID_INPUT", "Content must be canonical base64")
    if (data.length > MAX_BYTES) throw new ToolError("LIMIT_EXCEEDED", "Content exceeds the byte limit", 413)
    return data
  },

  /**
  Атомарно заменяет обычный файл через соседний временный файл, сохраняя биты доступа.
  Временный файл очищается при любом исходе. Проверка хеша не является межпроцессным CAS.

  @param path - Проверенный абсолютный путь существующего файла.

  @param data - Подготовленные и ограниченные вызывающей операцией байты.

  @param expectedHash - Ожидаемый SHA-256 исходного содержимого, если задано предусловие.

  @throws ToolError при неверном виде пути или конфликте хеша; ошибка ОС при записи или rename.
  */
  replaceFile(path: string, data: Buffer, expectedHash?: string): void {
    const stat = lstatSync(path)
    if (!stat.isFile()) throw new ToolError("INVALID_PATH_TYPE", "Path must be a regular file")
    if (expectedHash !== undefined && access.digest(access.readWhole(path)) !== expectedHash) throw new ToolError("CONFLICT", "Content hash does not match", 409)
    const temporary = join(dirname(path), `.ai-tools-${randomUUID()}.tmp`)
    try {
      const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, stat.mode & 0o777)
      try {
        writeFileSync(fd, data)
        fchmodSync(fd, stat.mode & 0o777)
      } finally { closeSync(fd) }
      renameSync(temporary, path)
    } finally {
      try { unlinkSync(temporary) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
    }
  },
}
export default access
