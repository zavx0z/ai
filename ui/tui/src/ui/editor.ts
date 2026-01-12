import { join } from "node:path"
import { unlink } from "node:fs/promises"
import { TMP_DIR } from "../core/tools"

export async function editInEditor(initialContent: string = ""): Promise<string | null> {
  const filename = `TASK_${Date.now()}.md`
  const filepath = join(TMP_DIR, filename)

  await Bun.write(filepath, initialContent)

  const editor = process.env.EDITOR || "vim"

  const args = [editor]
  if (editor.includes("vim") || editor.includes("nvim")) {
    args.push("+startinsert")
  }
  args.push(filepath)

  const proc = Bun.spawn(args, {
    stdio: ["inherit", "inherit", "inherit"],
  })

  await proc.exited

  try {
    const file = Bun.file(filepath)
    if (await file.exists()) {
      const content = await file.text()
      await unlink(filepath)
      return content.trim()
    }
  } catch (e) {
    // silent
  }

  return null
}