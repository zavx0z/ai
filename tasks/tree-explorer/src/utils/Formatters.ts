export class Formatters {
  static formatSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  static formatDate(date: Date): string {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }

  static padRight(text: string, length: number): string {
    return text + " ".repeat(Math.max(0, length - text.length))
  }

  static padLeft(text: string, length: number): string {
    return " ".repeat(Math.max(0, length - text.length)) + text
  }

  static centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length)
    const leftPadding = Math.floor(padding / 2)
    const rightPadding = padding - leftPadding
    return " ".repeat(leftPadding) + text + " ".repeat(rightPadding)
  }
}
