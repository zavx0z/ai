import { join } from "path"
import { readdir } from "node:fs/promises"

export interface TargetContext {
  name: string
  path: string
  type: "root" | "package"
}

export async function scanTargetProject(): Promise<TargetContext[]> {
  const currentDir = process.cwd()
  const contexts: TargetContext[] = []

  try {
    const pkgPath = join(currentDir, "package.json")
    if (await Bun.file(pkgPath).exists()) {
      const pkg = await Bun.file(pkgPath).json()
      contexts.push({ name: `${pkg.name || "Root"} (Root)`, path: currentDir, type: "root" })

      if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
        for (const pattern of pkg.workspaces) {
          if (pattern.endsWith("/*")) {
            // Обработка шаблонов с маской: packages/*
            const workspaceRoot = join(currentDir, pattern.replace(/\/\*$/, ""))
            try {
              const dirs = await readdir(workspaceRoot, { withFileTypes: true })
              for (const dir of dirs) {
                if (dir.isDirectory()) {
                  const subPkgPath = join(workspaceRoot, dir.name)
                  const subPkgJson = join(subPkgPath, "package.json")
                  if (await Bun.file(subPkgJson).exists()) {
                    const subPkg = await Bun.file(subPkgJson).json()
                    contexts.push({ name: subPkg.name || dir.name, path: subPkgPath, type: "package" })
                  }
                }
              }
            } catch (e) {
              // Директория не существует или ошибка доступа
              continue
            }
          } else {
            // Обработка конкретных путей (директория первого уровня): tools
            const fullPath = join(currentDir, pattern)
            const subPkgJson = join(fullPath, "package.json")
            if (await Bun.file(subPkgJson).exists()) {
              const subPkg = await Bun.file(subPkgJson).json()
              contexts.push({ name: subPkg.name || pattern, path: fullPath, type: "package" })
            }
          }
        }
      }
    } else {
       contexts.push({ name: "Current Directory", path: currentDir, type: "root" })
    }
  } catch (e) {
    contexts.push({ name: "Current Directory", path: currentDir, type: "root" })
  }
  return contexts
}