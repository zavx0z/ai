export const Keys = {
  UP: "\u001b[A",
  DOWN: "\u001b[B",
  ENTER: "\r",
  CTRL_C: "\u0003",
  ESC: "\u001b"
}

export function withRawMode<T>(callback: () => Promise<T>): Promise<T> {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding("utf8")
  
  return callback().finally(() => {
    process.stdin.setRawMode(false)
    process.stdin.pause()
  })
}