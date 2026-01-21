import { join } from "path"

const CONFIG_FILENAME = "zavx0z.yaml"
const DEFAULT_CONFIG_CONTENT = `
exclude:
  - node_modules
  - dist
  - .git
  - .vscode
  - zavx0z.yaml
  - .idx
  - .idea
  - .cursor
  - tmp
  - .gitignore
  - bun.lock
`

export async function ensureConfigFile(dirPath: string) {
  const configPath = join(dirPath, CONFIG_FILENAME)
  const file = Bun.file(configPath)

  if (!(await file.exists())) {
    try {
      await Bun.write(configPath, DEFAULT_CONFIG_CONTENT)
    } catch (e) {
      // Silent error
    }
  }
}
