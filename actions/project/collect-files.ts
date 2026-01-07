import { readFileSync, writeFileSync, readdirSync, lstatSync } from "fs"
import { extname, relative, join } from "path"

// --- ФУНКЦИЯ НУМЕРАЦИИ СТРОК ---

/**
 * Нумерует строки в тексте
 * @param content - содержимое файла
 * @returns текста с номерами строк
 */
function addLineNumbers(content: string): string {
	const lines = content.split("\n")
	
	// Определяем максимальную ширину номера строки
	const maxNumberLength = lines.length.toString().length
	
	// Добавляем номера строк
	const numberedLines = lines.map((line, i) => {
		const lineNumber = i + 1
		const paddedNumber = lineNumber.toString().padStart(maxNumberLength, " ")
		return `${paddedNumber} | ${line}`
	})
	
	return numberedLines.join("\n")
}

// --- КОНФИГУРАЦИЯ ---
const CONFIG = {
	// Куда сохранять результат
	OUTPUT_FILE: "ai-documentation.md",
	
	// Корневая директория проекта
	PROJECT_ROOT: process.cwd(),
	
	// Расширения файлов для включения
	INCLUDED_EXTENSIONS: [
		".ts", ".tsx", ".js", ".jsx", ".wgsl",
		".html", ".htm", ".css", ".json", ".yaml", ".yml",
		".md", ".mdx", ".txt", ".env", ".gitignore"
	],
	
	// Директории и файлы для исключения
	EXCLUDE: [
		"node_modules", "dist", "build", ".git", ".idea", ".vscode",
		"ai-documentation.md", ".cursor", "scripts"
	],
	
	// Иконки для типов файлов
	FILE_ICONS: {
		".ts": "📘", ".tsx": "📘", ".js": "📗", ".jsx": "📗",
		".wgsl": "🎨", ".html": "🌐", ".css": "🎨", ".json": "📋",
		".md": "📝", ".yaml": "⚙️", ".yml": "⚙️", ".txt": "📄"
	} as Record<string, string>,
	
	// Языки для блоков кода
	LANGUAGES: {
		".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
		".wgsl": "wgsl", ".html": "html", ".css": "css", ".json": "json",
		".md": "markdown", ".yaml": "yaml", ".yml": "yaml", ".txt": "text"
	} as Record<string, string>,
	
	// Добавлять ли нумерацию строк
	ADD_LINE_NUMBERS: true,
	
	// Файлы, для которых не нужно добавлять нумерацию
	EXCLUDE_LINE_NUMBERS: [".md", ".mdx", ".txt", ".json", ".yaml", ".yml", ".env"]
}

// --- ФУНКЦИИ ---

/**
 * Рекурсивно находит все файлы проекта
 */
function findProjectFiles(root: string = CONFIG.PROJECT_ROOT): string[] {
	const files: string[] = []
	
	function walk(dir: string) {
		let entries: string[] = []
		
		try {
			entries = readdirSync(dir)
		} catch {
			return // Игнорируем ошибки доступа
		}
		
		for (const entry of entries) {
			const fullPath = join(dir, entry)
			
			// Пропускаем исключенные директории/файлы
			if (CONFIG.EXCLUDE.includes(entry)) continue
			
			try {
				const stat = lstatSync(fullPath)
				
				if (stat.isDirectory()) {
					walk(fullPath)
				} else if (stat.isFile()) {
					const ext = extname(entry).toLowerCase()
					if (CONFIG.INCLUDED_EXTENSIONS.includes(ext)) {
						files.push(fullPath)
					}
				}
			} catch {
				// Игнорируем ошибки доступа к файлам
			}
		}
	}
	
	walk(root)
	return files
}

/**
 * Создает дерево файлов
 */
function createFileTree(files: string[]): string {
	const tree: string[] = ["```text", "📦 project"]
	
	// Группируем файлы по директориям
	const dirs: Record<string, string[]> = {}
	
	for (const file of files) {
		const relPath = relative(CONFIG.PROJECT_ROOT, file)
		const parts = relPath.split("/").filter(Boolean)
		
		if (parts.length === 1) {
			if (!dirs["."]) dirs["."] = []
			dirs["."].push(parts[0]!)
		} else {
			const dir = parts.slice(0, -1).join("/")
			const filename = parts[parts.length - 1]
			if (!dirs[dir]) dirs[dir] = []
			dirs[dir].push(filename!)
		}
	}
	
	// Файлы в корне
	if (dirs["."]) {
		for (const file of dirs["."].sort()) {
			const ext = extname(file).toLowerCase()
			const icon = CONFIG.FILE_ICONS[ext] || "📄"
			tree.push(`├── ${icon} ${file}`)
		}
	}
	
	// Поддиректории
	const sortedDirs = Object.keys(dirs).filter(d => d !== ".")
	sortedDirs.sort()
	
	sortedDirs.forEach((dir, i) => {
		const filesInDir = dirs[dir]?.sort() || []
		const isLastDir = i === sortedDirs.length - 1
		const prefix = isLastDir ? "└──" : "├──"
		
		tree.push(`${prefix} 📁 ${dir}/`)
		
		filesInDir.forEach((file, j) => {
			const isLast = j === filesInDir.length - 1
			const filePrefix = isLastDir && isLast ? "    " : "│   "
			const ext = extname(file).toLowerCase()
			const icon = CONFIG.FILE_ICONS[ext] || "📄"
			tree.push(`${filePrefix}└── ${icon} ${file}`)
		})
	})
	
	tree.push("```")
	return tree.join("\n")
}

/**
 * Собирает все файлы в один markdown с нумерацией строк
 */
function collectForAI(): void {
	console.log("🔍 Поиск файлов проекта...")
	const files = findProjectFiles()
	
	console.log(`📁 Найдено ${files.length} файлов`)
	
	const sections: string[] = [
		`# Документация проекта`,
		`> **Сгенерировано:** ${new Date().toLocaleString()}`,
		`> **Файлов:** ${files.length}`,
		`> **Нумерация строк:** ${CONFIG.ADD_LINE_NUMBERS ? "да" : "нет"}\n`,
		`## 📂 Структура проекта\n`,
		createFileTree(files),
		`\n---\n`
	]
	
	// Добавляем содержимое файлов
	files.forEach((filePath, index) => {
		try {
			const content = readFileSync(filePath, "utf-8")
			const relPath = relative(CONFIG.PROJECT_ROOT, filePath)
			const ext = extname(filePath).toLowerCase()
			const language = CONFIG.LANGUAGES[ext] || "text"
			
			// Решаем, добавлять ли нумерацию
			let fileContent = content
			if (CONFIG.ADD_LINE_NUMBERS && !CONFIG.EXCLUDE_LINE_NUMBERS.includes(ext)) {
				fileContent = addLineNumbers(content)
			}
			
			sections.push(`### 📄 ${relPath}\n`)
			sections.push(`\`\`\`${language}`)
			sections.push(fileContent)
			sections.push(`\`\`\``)
			
			// Добавляем статистику файла
			const lines = content.split("\n").length
			sections.push(`\n*📊 Статистика: ${lines} строк, ${content.length} символов*\n`)
			
			// Разделитель между файлами (кроме последнего)
			if (index < files.length - 1) {
				sections.push("\n---\n")
			}
		} catch (error) {
			console.warn(`⚠️  Ошибка чтения файла ${filePath}:`, error)
		}
	})
	
	// Сохраняем результат
	const result = sections.join("\n")
	writeFileSync(CONFIG.OUTPUT_FILE, result, "utf-8")
	
	console.log(`✅ Собрано ${files.length} файлов в ${CONFIG.OUTPUT_FILE}`)
	console.log(`📊 Размер: ${(result.length / 1024).toFixed(2)} KB`)
	
	// Статистика по файлам
	const stats = {
		totalFiles: files.length,
		withNumbers: files.filter(f => {
			const ext = extname(f).toLowerCase()
			return CONFIG.ADD_LINE_NUMBERS && !CONFIG.EXCLUDE_LINE_NUMBERS.includes(ext)
		}).length,
		withoutNumbers: files.filter(f => {
			const ext = extname(f).toLowerCase()
			return !CONFIG.ADD_LINE_NUMBERS || CONFIG.EXCLUDE_LINE_NUMBERS.includes(ext)
		}).length
	}
	
	console.log(`📈 Файлов с нумерацией: ${stats.withNumbers}`)
	console.log(`📈 Файлов без нумерации: ${stats.withoutNumbers}`)
}

// --- ЗАПУСК ---
collectForAI()