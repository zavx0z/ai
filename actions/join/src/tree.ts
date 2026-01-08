import { relative } from "path"
import { getCommonRoot } from "./file"

interface TreeNode {
  name: string
  children: Map<string, TreeNode>
  isFile?: boolean
}

/**
 * Создает дерево файлов из списка
 */
export function createFileTree(files: string[]): string {
  if (files.length === 0) return ""

  // Определяем общий корень для относительных путей
  const commonRoot = getCommonRoot(files)

  // Корневой узел
  const root: TreeNode = {
    name: "",
    children: new Map(),
  }

  // Строим дерево
  for (const file of files) {
    const relPath = relative(commonRoot, file)
    const parts = relPath.split("/").filter(Boolean)

    let currentNode = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const isFile = i === parts.length - 1

      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          children: new Map(),
          isFile,
        })
      }

      currentNode = currentNode.children.get(part)!
    }
  }

  // Рекурсивно строим строковое представление дерева
  const result: string[] = []

  function buildTree(node: TreeNode, prefix: string = "", isLast: boolean = true): void {
    if (node.name) {
      const connector = isLast ? "└──" : "├──"
      const name = node.isFile ? node.name : `${node.name}/`
      result.push(`${prefix}${connector} ${name}`)

      // Обновляем префикс для дочерних элементов
      prefix += isLast ? "    " : "│   "
    }

    // Сортируем: сначала директории, потом файлы, все по алфавиту
    const sortedChildren = Array.from(node.children.entries()).sort(([aName, aNode], [bName, bNode]) => {
      // Директории идут перед файлами
      if (aNode.isFile !== bNode.isFile) {
        return aNode.isFile ? 1 : -1
      }
      // Затем по алфавиту
      return aName.localeCompare(bName)
    })

    sortedChildren.forEach(([childName, childNode], index) => {
      const isLastChild = index === sortedChildren.length - 1
      buildTree(childNode, prefix, isLastChild)
    })
  }

  // Начинаем с корня (но не выводим его имя)
  buildTree(root)

  return result.join("\n")
}
