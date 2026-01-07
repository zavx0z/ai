async function numberLines(src: string, dst?: string): Promise<string> {
  const content = await Bun.file(src).text()
  const lines = content.split("\n")

  // Определяем максимальную ширину номера строки
  const maxNumberLength = lines.length.toString().length

  // Создаем нумерованный текст с выравниванием
  const result = lines
    .map((line, i) => {
      const lineNumber = i + 1
      const paddedNumber = lineNumber.toString().padStart(maxNumberLength, " ")
      return `${paddedNumber} | ${line}`
    })
    .join("\n")

  if (dst) {
    await Bun.write(dst, result)
  }

  return result
}

// Использование
if (import.meta.main) {
  if (process.argv.length < 3) {
    console.log("Использование: bun number.ts <src> [dst]")
    console.log("Примеры:")
    console.log("  bun number.ts input.ts")
    console.log("  bun number.ts input.ts output.ts")
    process.exit(1)
  }

  const result = await numberLines(process.argv[2]!, process.argv[3])
  if (!process.argv[3]) {
    console.log(result)
  } else {
    console.log(`Файл сохранен: ${process.argv[3]}`)
  }
}
