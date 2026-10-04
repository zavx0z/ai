/**
Подготавливает потребительские описания через публичный TypeDoc reader.
Вызывается при разработке; HTTP использует готовый JSON без чтения исходников.
Путь к проекту с установленным reader передаётся явно в аргументе команды.

@packageDocumentation
*/
import {createHash} from "node:crypto"
import {createRequire} from "node:module"
import {readFileSync, writeFileSync} from "node:fs"
import {dirname, relative, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import {tools} from "../src/bindings.ts"

const flags = process.argv.slice(2)
const check = flags.includes("--check")
const providerProject = flags.find(value => value !== "--check")
if (providerProject === undefined || flags.filter(value => value !== "--check").length !== 1) {
  throw new Error("Передайте путь к проекту с установленным @zavx0z/immersive-typedoc/parser; --check проверяет актуальность без записи")
}
const provider = createRequire(resolve(providerProject, "package.json"))
const {analyzeTypeDoc} = provider("@zavx0z/immersive-typedoc/parser")
const ownRequire = createRequire(import.meta.url)
const root = fileURLToPath(new URL("../../../", import.meta.url))
const target = fileURLToPath(new URL("../src/descriptions.json", import.meta.url))
const descriptions = []
const sources = new Map<string, string>()
for (const tool of tools) {
  const owner = dirname(ownRequire.resolve(tool.packageName))
  const manifestPath = resolve(owner, "package.json")
  const manifestText = readFileSync(manifestPath, "utf8")
  sources.set(manifestPath, createHash("sha256").update(manifestText).digest("hex"))
  const manifest = JSON.parse(manifestText)
  const analysis = await analyzeTypeDoc({root, path: relative(root, resolve(owner, "contract/index.ts"))})
  const input = analysis.document.declarations.filter((item: {name: string}) => item.name.endsWith(".Input"))
  const output = analysis.document.declarations.filter((item: {name: string}) => item.name.endsWith(".Output"))
  if (input.length !== 1 || output.length !== 1 || input[0].schema?.type !== "object" || output[0].schema === undefined
    || typeof manifest.description !== "string" || manifest.description.trim() === "") {
    throw new Error(`Неполное описание инструмента ${tool.name}`)
  }
  for (const source of analysis.sources) {
    const previous = sources.get(source.path)
    if (previous !== undefined && previous !== source.digest) throw new Error(`Исходник менялся между чтениями: ${source.path}`)
    sources.set(source.path, source.digest)
  }
  for (const member of input[0].members) {
    if (member.defaultValue === undefined) continue
    const property = input[0].schema.properties?.[member.name]
    if (property === undefined) throw new Error(`Описание default не связано со схемой: ${tool.name}.${member.name}`)
    try { property.default = JSON.parse(member.defaultValue) }
    catch { property.default = member.defaultValue }
  }
  descriptions.push({
    name: tool.name,
    description: manifest.description,
    // Исполнители запрещают неизвестные поля аргументов до побочного эффекта.
    arguments: {...input[0].schema, additionalProperties: false},
    result: output[0].schema,
  })
}
for (const [path, digest] of sources) {
  if (createHash("sha256").update(readFileSync(path, "utf8")).digest("hex") !== digest) {
    throw new Error(`Исходник изменился во время генерации: ${path}`)
  }
}
const content = JSON.stringify(descriptions, null, 2) + "\n"
if (check) {
  if (readFileSync(target, "utf8") !== content) throw new Error("Описания инструментов устарели: выполните bun run descriptions с тем же проектом reader")
  process.stdout.write(`Описания ${descriptions.length} инструментов актуальны\n`)
} else {
  writeFileSync(target, content)
  process.stdout.write(`Обновлены описания ${descriptions.length} инструментов\n`)
}
