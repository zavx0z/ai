import { join } from "path"

const CONFIG_FILENAME = "zavx0z.yaml"
const DEFAULT_CONFIG_CONTENT = `# zavx0z.yaml - Конфигурация проекта
# Создано автоматически AI-CLI
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