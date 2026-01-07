  1 | #!/usr/bin/env bun
  2 | import { CommentRemover } from "./index"
  3 | import type { RemovalOptions } from "./types"
  4 | 
  5 | async function main() {
  6 |   const args = process.argv.slice(2)
  7 |   const command = args[0]
  8 | 
  9 |   if (!command || command === "--help" || command === "-h") {
 10 |     showHelp()
 11 |     return
 12 |   }
 13 | 
 14 |   try {
 15 |     switch (command) {
 16 |       case "clean":
 17 |         await handleCleanCommand(args.slice(1))
 18 |         break
 19 | 
 20 |       case "restore":
 21 |         await handleRestoreCommand(args.slice(1))
 22 |         break
 23 | 
 24 |       case "stats":
 25 |         await handleStatsCommand(args.slice(1))
 26 |         break
 27 | 
 28 |       default:
 29 |         console.error(`Неизвестная команда: ${command}`)
 30 |         showHelp()
 31 |         process.exit(1)
 32 |     }
 33 |   } catch (error) {
 34 |     console.error("❌ Ошибка:", error instanceof Error ? error.message : error)
 35 |     process.exit(1)
 36 |   }
 37 | }
 38 | 
 39 | async function handleCleanCommand(args: string[]) {
 40 |   const options: RemovalOptions = {}
 41 |   let sourcePath = ""
 42 |   let outputPath: string | undefined
 43 |   let metadataPath: string | undefined
 44 | 
 45 |   // Парсим аргументы
 46 |   for (let i = 0; i < args.length; i++) {
 47 |     const arg = args[i]
 48 | 
 49 |     switch (arg) {
 50 |       case "--compact":
 51 |         options.preserveNewlines = false
 52 |         break
 53 | 
 54 |       case "--keep-jsdoc":
 55 |         options.keepOnly = ["jsdoc"]
 56 |         break
 57 | 
 58 |       case "--remove-only":
 59 |         if (args[i + 1]) {
 60 |           const types = args[i + 1].split(",").map((t) => t.trim()) as any[]
 61 |           options.removeOnly = types
 62 |           i++
 63 |         }
 64 |         break
 65 | 
 66 |       case "--output":
 67 |         outputPath = args[++i]
 68 |         break
 69 | 
 70 |       case "--metadata":
 71 |         metadataPath = args[++i]
 72 |         break
 73 | 
 74 |       case "--no-shebang":
 75 |         options.includeShebang = false
 76 |         break
 77 | 
 78 |       default:
 79 |         if (!arg.startsWith("--") && !sourcePath) {
 80 |           sourcePath = arg
 81 |         }
 82 |         break
 83 |     }
 84 |   }
 85 | 
 86 |   if (!sourcePath) {
 87 |     console.error("❌ Укажите путь к исходному файлу")
 88 |     showHelp()
 89 |     process.exit(1)
 90 |   }
 91 | 
 92 |   console.log(`🧹 Очищаем комментарии из: ${sourcePath}`)
 93 | 
 94 |   const metadata = await CommentRemover.saveCleanedCode(sourcePath, outputPath, metadataPath, options)
 95 | 
 96 |   const stats = CommentRemover.getCommentStats(metadata.comments)
 97 | 
 98 |   console.log("✅ Готово!")
 99 |   console.log(`📄 Очищенный файл: ${metadata.cleanedFile}`)
100 |   console.log(`📊 Метаданные: ${metadataPath || sourcePath.replace(/\.(ts|js|tsx|jsx)$/, ".comments.json")}`)
101 |   console.log("\n📈 Статистика:")
102 |   console.log(`   Всего комментариев: ${stats.total}`)
103 |   console.log(`   Однострочных: ${stats.byType["single-line"]}`)
104 |   console.log(`   Многострочных: ${stats.byType["multi-line"]}`)
105 |   console.log(`   JSDoc/Typedoc: ${stats.byType["jsdoc"]}`)
106 |   console.log(`   Строк с комментариями: ${stats.linesWithComments}`)
107 |   console.log(`   Общий размер комментариев: ${stats.totalCommentLength} символов`)
108 | }
109 | 
110 | async function handleRestoreCommand(args: string[]) {
111 |   let cleanedPath: string | undefined
112 |   let metadataPath: string | undefined
113 |   let outputPath: string | undefined
114 | 
115 |   for (let i = 0; i < args.length; i++) {
116 |     const arg = args[i]
117 | 
118 |     switch (arg) {
119 |       case "--cleaned":
120 |         cleanedPath = args[++i]
121 |         break
122 | 
123 |       case "--metadata":
124 |         metadataPath = args[++i]
125 |         break
126 | 
127 |       case "--output":
128 |         outputPath = args[++i]
129 |         break
130 | 
131 |       default:
132 |         if (!arg.startsWith("--")) {
133 |           if (!cleanedPath) {
134 |             cleanedPath = arg
135 |           } else if (!metadataPath) {
136 |             metadataPath = arg
137 |           }
138 |         }
139 |         break
140 |     }
141 |   }
142 | 
143 |   if (!cleanedPath || !metadataPath) {
144 |     console.error("❌ Укажите пути к очищенному файлу и файлу метаданных")
145 |     showHelp()
146 |     process.exit(1)
147 |   }
148 | 
149 |   console.log(`🔧 Восстанавливаем комментарии из: ${metadataPath}`)
150 | 
151 |   const restoredCode = await CommentRemover.restoreFromMetadata(cleanedPath, metadataPath)
152 | 
153 |   const finalOutput = outputPath || cleanedPath.replace(".clean.", ".restored.")
154 |   await Bun.write(finalOutput, restoredCode)
155 | 
156 |   console.log("✅ Готово!")
157 |   console.log(`📄 Восстановленный файл: ${finalOutput}`)
158 | }
159 | 
160 | async function handleStatsCommand(args: string[]) {
161 |   const filePath = args[0]
162 | 
163 |   if (!filePath) {
164 |     console.error("❌ Укажите путь к файлу")
165 |     showHelp()
166 |     process.exit(1)
167 |   }
168 | 
169 |   const sourceCode = await Bun.file(filePath).text()
170 |   const metadata = CommentRemover.collectComments(sourceCode, filePath)
171 |   const stats = CommentRemover.getCommentStats(metadata)
172 | 
173 |   console.log(`📊 Статистика комментариев для: ${filePath}`)
174 |   console.log(`\nВсего комментариев: ${stats.total}`)
175 |   console.log(`Однострочных: ${stats.byType["single-line"]}`)
176 |   console.log(`Многострочных: ${stats.byType["multi-line"]}`)
177 |   console.log(`JSDoc/Typedoc: ${stats.byType["jsdoc"]}`)
178 |   console.log(`Строк с комментариями: ${stats.linesWithComments}`)
179 |   console.log(`Общий размер комментариев: ${stats.totalCommentLength} символов`)
180 |   console.log(`Процент комментариев: ${((stats.totalCommentLength / sourceCode.length) * 100).toFixed(2)}%`)
181 | 
182 |   // Топ 5 самых длинных комментариев
183 |   if (metadata.length > 0) {
184 |     console.log("\n🏆 Топ-5 самых длинных комментариев:")
185 |     const sortedByLength = [...metadata].sort((a, b) => b.text.length - a.text.length).slice(0, 5)
186 | 
187 |     sortedByLength.forEach((comment, index) => {
188 |       const preview = comment.text.length > 100 ? comment.text.substring(0, 100) + "..." : comment.text
189 |       console.log(`  ${index + 1}. Строка ${comment.line}, ${comment.type}, ${comment.text.length} символов:`)
190 |       console.log(`     ${preview.replace(/\n/g, "\n     ")}`)
191 |     })
192 |   }
193 | }
194 | 
195 | function showHelp() {
196 |   console.log(`
197 | Comment Remover - Удаление и восстановление комментариев через AST
198 | 
199 | Использование:
200 |   bun run cli.ts <command> [options]
201 | 
202 | Команды:
203 |   clean <file>          - Удалить комментарии из файла
204 |   restore <cleaned> <metadata> - Восстановить комментарии
205 |   stats <file>          - Показать статистику комментариев
206 | 
207 | Опции для clean:
208 |   --output <path>       - Путь для очищенного файла
209 |   --metadata <path>     - Путь для файла метаданных
210 |   --compact             - Сжать код (удалить пустые строки)
211 |   --keep-jsdoc          - Сохранять только JSDoc комментарии
212 |   --remove-only <types> - Удалять только указанные типы (через запятую)
213 |   --no-shebang          - Не сохранять shebang
214 | 
215 | Опции для restore:
216 |   --cleaned <path>      - Путь к очищенному файлу
217 |   --metadata <path>     - Путь к файлу метаданных
218 |   --output <path>       - Путь для восстановленного файла
219 | 
220 | Примеры:
221 |   bun run cli.ts clean src/index.ts
222 |   bun run cli.ts clean src/index.ts --compact --output dist/index.js
223 |   bun run cli.ts restore dist/index.clean.js dist/index.comments.json
224 |   bun run cli.ts stats src/index.ts
225 |   `)
226 | }
227 | 
228 | if (import.meta.main) {
229 |   main()
230 | }
231 | 