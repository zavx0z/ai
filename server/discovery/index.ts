/**
 Раскрывает package.json workspaces/exports и локальные контракты выбранного узла.
 @remarks TypeScript читается как текст, а не исполняется. Контракты и сценарии
 загружаются только по запросу. Не является копией runtime Storybook.
 @packageDocumentation
 */
import {realpathSync, globSync} from "node:fs"
import {dirname} from "node:path"
import ToolError from "@tech/failure"
import {source, overview} from "./src/read.ts"

import type {ServerDiscovery} from "./contract/index.ts"
export type {ServerDiscovery} from "./contract/index.ts"

/**
Читает workspace glob и публичные входы для адресуемого каталога исходников.

@param input - Доверенный checkout каталога и адреса уже подключённых исполнителей.

@returns Каталог с ленивым чтением TSDoc, пространства контракта и успешных сценариев.

@throws ToolError при неверной структуре, отсутствующем binding, неизвестном адресе или недоступной форме.
*/
export default function createDiscovery(input: ServerDiscovery.Input): ServerDiscovery.Output {
  const root = realpathSync(input.repositoryRoot)
  const manifest = JSON.parse(source(root, "package.json")!) as {name: string; label?: string; workspaces: string[]}
  const rootNode = manifest.name.split("/").at(-1)!
  if (!/^[a-z][a-z0-9-]*$/.test(rootNode) || !Array.isArray(manifest.workspaces)) throw new ToolError("INVALID_STRUCTURE", "Invalid root manifest", 500)
  const nodes = new Map<string, {name: string; label: string; directory: string; entry?: string; package: boolean}>()
  nodes.set(rootNode, {name: manifest.name, label: manifest.label ?? rootNode, directory: ".", entry: "index.ts", package: true})
  for (const pattern of manifest.workspaces) {
    if (typeof pattern !== "string" || !/^[a-z0-9*/-]+$/.test(pattern)
      || pattern.split("/").some(part => part === "..")) {
      throw new ToolError("INVALID_STRUCTURE", "Invalid workspace glob", 500)
    }
  }
  const manifests = globSync(manifest.workspaces.map(pattern => `${pattern}/package.json`), {
    cwd: root, exclude: ["node_modules/**", ".git/**"],
  }).sort()
  for (const filename of manifests) {
    const directory = dirname(filename)
    const pkg = JSON.parse(source(root, filename)!) as {name: string; label?: string; exports?: Record<string, string>}
    const segments = directory.split("/")
    for (let length = 1; length < segments.length; length++) {
      const parent = segments.slice(0, length).join("/")
      const address = `${rootNode}/${parent}`
      if (!nodes.has(address)) nodes.set(address, {
        name: segments[length - 1]!, label: segments[length - 1]!, directory: parent, package: false,
      })
    }
    const node = `${rootNode}/${directory}`
    const entry = pkg.exports?.["."]
    if (entry !== "./index.ts") throw new ToolError("INVALID_STRUCTURE", "Packages require their own index.ts export", 500)
    source(root, `${directory}/index.ts`)
    nodes.set(node, {name: pkg.name, label: pkg.label ?? segments.at(-1)!, directory,
      entry: `${directory}/index.ts`, package: true})
  }
  for (const address of input.runnable) if (!nodes.has(address)) throw new ToolError("INVALID_STRUCTURE", "An executable binding has no public export", 500)
  return {
    has: node => nodes.has(node),
    describe: (node = rootNode, view = "overview") => {
      if (typeof node !== "string" || node.length > 256 || !nodes.has(node)) throw new ToolError("UNKNOWN_NODE", "Unknown structural node", 404)
      const owner = nodes.get(node)!
      if (view === "contract") {
        const contract = source(root, `${owner.directory}/contract/index.ts`, true)
        if (contract === null) throw new ToolError("VIEW_NOT_FOUND", "This node has no contract", 404)
        return {node, view, format: "typescript", source: contract}
      }
      if (view === "scenarios") {
        const scenario = source(root, `${owner.directory}/spec/scenario.spec.ts`, true)
        if (scenario === null) throw new ToolError("VIEW_NOT_FOUND", "This node has no scenarios", 404)
        return {node, view, format: "typescript", executed: false, source: scenario}
      }
      if (view !== "overview") throw new ToolError("VIEW_NOT_FOUND", "Unknown view", 404)
      const children = [...nodes.entries()].filter(([address]) => address.startsWith(`${node}/`) && !address.slice(node.length + 1).includes("/"))
        .map(([address, child]) => ({node: address, label: child.label, runnable: input.runnable.has(address)}))
      const description = owner.entry === undefined ? null : overview(source(root, owner.entry, true))
      const views = ["overview"]
      if (source(root, `${owner.directory}/contract/index.ts`, true) !== null) views.push("contract")
      if (source(root, `${owner.directory}/spec/scenario.spec.ts`, true) !== null) views.push("scenarios")
      return {node, name: owner.name, label: owner.label, description, runnable: input.runnable.has(node), children,
        actions: input.runnable.has(node) ? ["run"] : [], views}
    },
  }
}
