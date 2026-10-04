/**
Подготавливает потребительские описания через публичный TypeDoc reader.
Вызывается при разработке; потребители используют ресурс владельца без чтения исходников.
Путь к проекту с установленным reader передаётся явно в аргументе команды.

@packageDocumentation
*/
import {createHash} from "node:crypto"
import {createRequire} from "node:module"
import {readFileSync, writeFileSync} from "node:fs"
import {dirname, relative, resolve} from "node:path"
import {fileURLToPath} from "node:url"

const flags = process.argv.slice(2)
const check = flags.includes("--check")
const providerProject = flags.find(value => value !== "--check")
if (providerProject === undefined || flags.filter(value => value !== "--check").length !== 1) {
  throw new Error("Передайте путь к проекту с установленным @zavx0z/immersive-typedoc/parser; --check проверяет актуальность без записи")
}
const provider = createRequire(resolve(providerProject, "package.json"))
const {analyzeTypeDoc} = provider("@zavx0z/immersive-typedoc/parser")
const root = fileURLToPath(new URL("../../../", import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const owners = new Set<string>()
for (const pattern of manifest.workspaces as string[]) {
  for await (const path of new Bun.Glob(`${pattern}/package.json`).scan({cwd: root, onlyFiles: true})) {
    const file = resolve(root, path)
    const candidate = JSON.parse(readFileSync(file, "utf8"))
    if (candidate.exports?.["./description.json"] === "./description.json") owners.add(dirname(file))
  }
}
const descriptions = []
const sources = new Map<string, string>()
for (const owner of [...owners].sort()) {
  const manifestPath = resolve(owner, "package.json")
  const manifestText = readFileSync(manifestPath, "utf8")
  sources.set(manifestPath, createHash("sha256").update(manifestText).digest("hex"))
  const manifest = JSON.parse(manifestText)
  const analysis = await analyzeTypeDoc({root, path: relative(root, resolve(owner, "contract/index.ts"))})
  const input = analysis.document.declarations.filter((item: {name: string}) => item.name.endsWith(".Input"))
  const output = analysis.document.declarations.filter((item: {name: string}) => item.name.endsWith(".Output"))
  if (input.length !== 1 || output.length !== 1 || input[0].schema?.type !== "object" || output[0].schema === undefined
    || typeof manifest.description !== "string" || manifest.description.trim() === "") {
    throw new Error(`Неполное описание инструмента ${manifest.name}`)
  }
  for (const source of analysis.sources) {
    const previous = sources.get(source.path)
    if (previous !== undefined && previous !== source.digest) throw new Error(`Исходник менялся между чтениями: ${source.path}`)
    sources.set(source.path, source.digest)
  }
  for (const member of input[0].members) {
    if (member.defaultValue === undefined) continue
    const property = input[0].schema.properties?.[member.name]
    if (property === undefined) throw new Error(`Описание default не связано со схемой: ${manifest.name}.${member.name}`)
    try { property.default = JSON.parse(member.defaultValue) }
    catch { property.default = member.defaultValue }
  }
  descriptions.push({target: resolve(owner, "description.json"), value: {
    description: manifest.description,
    // Исполнители запрещают неизвестные поля аргументов до побочного эффекта.
    arguments: {...input[0].schema, additionalProperties: false},
    result: output[0].schema,
  }})
}
for (const [path, digest] of sources) {
  if (createHash("sha256").update(readFileSync(path, "utf8")).digest("hex") !== digest) {
    throw new Error(`Исходник изменился во время генерации: ${path}`)
  }
}
for (const {target, value} of descriptions) {
  const content = JSON.stringify(value, null, 2) + "\n"
  if (check) {
    if (readFileSync(target, "utf8") !== content) throw new Error(`Описание инструмента устарело: ${target}`)
  } else {
    writeFileSync(target, content)
  }
}
process.stdout.write(`${check ? "Проверены" : "Обновлены"} описания ${descriptions.length} инструментов у владельцев\n`)
