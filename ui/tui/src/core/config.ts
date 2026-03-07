import { join } from "path"

const CONFIG_FILENAME = "zavx0z.yaml"
const CONFIG_DIR = ".ai"
const DEFAULT_CONFIG_CONTENT = `
exclude:
  - node_modules
  - dist
  - .git
  - .vscode
  - .ai
  - tmp
  - .idx
  - .idea
  - .cursor
  - .gitignore
  - bun.lock
  - .DS_Store
  - .firebase
  - .firebaserc
  - bunfig.toml
  - .github
  - .png
  - .jpg
  - .jpeg
  - .gif
  - .webp
  - .ico
`

export async function ensureConfigFile(dirPath: string) {
  const configDir = join(dirPath, CONFIG_DIR)
  const configPath = join(configDir, CONFIG_FILENAME)
  
  // Создаём директорию .ai если не существует
  await Bun.$`mkdir -p ${configDir}`.quiet().catch(() => {})
  
  const file = Bun.file(configPath)

  if (!(await file.exists())) {
    try {
      await Bun.write(configPath, DEFAULT_CONFIG_CONTENT)
    } catch (e) {
      // Silent error
    }
  }
}
