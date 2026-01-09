import ts from "typescript"
import type { LintError, LinterOptions } from "./types"
import path from "path"
import fs from "fs"

async function loadTsConfig(configPath: string, verbose: boolean = false): Promise<ts.ParsedCommandLine> {
  const configFileText = await Bun.file(configPath).text()
  const configFile = ts.parseConfigFileTextToJson(configPath, configFileText)

  if (configFile.error) {
    throw new Error(`Ошибка парсинга tsconfig: ${configFile.error.messageText}`)
  }

  const configDir = path.dirname(configPath)

  // Используем parseJsonConfigFileContent с правильными параметрами
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDir,
    {}, // Базовые опции по умолчанию
    configPath,
    undefined, // Без дополнительных опций
    undefined, // Без расширений
    undefined // Без существующих watchOptions
  )

  if (verbose) {
    console.error(`📋 Загружен tsconfig из: ${configPath}`)
    console.error(`📋 Директория конфига: ${configDir}`)
    console.error(`📋 Наследование: ${configFile.config.extends || "нет"}`)
  }

  return parsedConfig
}

export async function parseTypeScriptFile(
  filePath: string,
  content: string,
  options: LinterOptions = {}
): Promise<LintError[]> {
  let compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    skipLibCheck: false,
    skipDefaultLibCheck: false,
  }

  let fileNames: string[] = [filePath]
  let projectRoot: string | undefined
  let hasTsConfig = false

  // Загружаем tsconfig если указан
  if (options.tsconfigPath && fs.existsSync(options.tsconfigPath)) {
    try {
      hasTsConfig = true
      const parsedConfig = await loadTsConfig(options.tsconfigPath, options.verbose)
      projectRoot = path.dirname(options.tsconfigPath)

      // Применяем опции из tsconfig
      compilerOptions = {
        ...compilerOptions,
        ...parsedConfig.options,
        // Обязательно оставляем noEmit: true
        noEmit: true,
      }

      // Используем все файлы из tsconfig, но добавляем текущий файл если его нет
      const tsConfigFileNames = parsedConfig.fileNames.map((f) => path.resolve(f))
      const currentFile = path.resolve(filePath)

      if (!tsConfigFileNames.includes(currentFile)) {
        fileNames = [...tsConfigFileNames, currentFile]
        if (options.verbose) {
          console.error(`📋 Добавлен файл для проверки: ${path.relative(process.cwd(), currentFile)}`)
        }
      } else {
        fileNames = tsConfigFileNames
      }

      if (options.verbose) {
        console.error(`📋 Загружено файлов из tsconfig: ${parsedConfig.fileNames.length}`)
        console.error(`📋 Опции компилятора:`, {
          target: ts.ScriptTarget[compilerOptions.target || ts.ScriptTarget.ES2020],
          module: ts.ModuleKind[compilerOptions.module || ts.ModuleKind.CommonJS],
          esModuleInterop: compilerOptions.esModuleInterop,
          lib: compilerOptions.lib,
          types: compilerOptions.types,
        })
      }
    } catch (error) {
      console.error(`⚠️ Ошибка загрузки tsconfig ${options.tsconfigPath}:`, error)
      if (options.verbose) {
        console.error(`⚠️ Использую базовые настройки.`)
      }
      hasTsConfig = false
    }
  } else if (options.verbose) {
    console.error(`📋 tsconfig не указан, использую базовые настройки`)
  }

  // Применяем strict режим если указан
  if (options.strict) {
    compilerOptions = {
      ...compilerOptions,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      alwaysStrict: true,
    }
  }

  // Убедимся что есть минимальные необходимые опции
  if (!compilerOptions.target) {
    compilerOptions.target = ts.ScriptTarget.ES2020
  }
  if (!compilerOptions.module) {
    compilerOptions.module = ts.ModuleKind.CommonJS
  }

  // Важно: добавляем esModuleInterop если не указано иначе
  if (compilerOptions.esModuleInterop === undefined) {
    compilerOptions.esModuleInterop = true
  }

  // Добавляем стандартные библиотеки если не указаны
  if (!compilerOptions.lib) {
    compilerOptions.lib = ["ES2020", "DOM"] // DOM нужен для console, setTimeout и т.д.
  }

  // Создаем виртуальный компилятор хост
  const compilerHost = ts.createCompilerHost(compilerOptions)

  // Переопределяем readFile для работы с переданным контентом
  const originalReadFile = compilerHost.readFile
  compilerHost.readFile = (fileName: string) => {
    const normalizedFileName = path.resolve(fileName)
    const targetFile = path.resolve(filePath)

    // Используем переданный контент для проверяемого файла
    if (normalizedFileName === targetFile) {
      return content
    }

    // Для файлов из tsconfig проверяем существование
    if (hasTsConfig && projectRoot) {
      const relativePath = path.relative(projectRoot, normalizedFileName)
      const fullPath = path.join(projectRoot, relativePath)

      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, "utf-8")
      }
    }

    // Для других файлов используем стандартное чтение
    return originalReadFile.call(compilerHost, fileName)
  }

  // Также переопределяем fileExists для виртуальных файлов
  const originalFileExists = compilerHost.fileExists
  compilerHost.fileExists = (fileName: string) => {
    const normalizedFileName = path.resolve(fileName)
    const targetFile = path.resolve(filePath)

    if (normalizedFileName === targetFile) {
      return true
    }

    if (hasTsConfig && projectRoot) {
      const relativePath = path.relative(projectRoot, normalizedFileName)
      const fullPath = path.join(projectRoot, relativePath)
      if (fs.existsSync(fullPath)) {
        return true
      }
    }

    return originalFileExists.call(compilerHost, fileName)
  }

  // Создаем программу со ВСЕМИ файлами
  const program = ts.createProgram(fileNames, compilerOptions, compilerHost)

  if (options.verbose) {
    console.error(`📋 Создана программа с ${fileNames.length} файлами`)
  }

  // Получаем диагностику только для исходного файла
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) {
    if (options.verbose) {
      console.error(`⚠️ Файл не найден в программе: ${filePath}`)
    }
    return []
  }

  // Берем только ошибки связанные с нашим файлом
  const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile)

  // Преобразуем диагностику в наш формат
  const errors: LintError[] = []

  for (const diagnostic of diagnostics) {
    if (!diagnostic.file) {
      // Глобальные ошибки (например, конфигурационные)
      if (options.verbose) {
        console.error(`ℹ️ Глобальная диагностика: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`)
      }
      continue
    }

    if (diagnostic.start === undefined) {
      continue
    }

    const start = diagnostic.start
    const length = diagnostic.length || 0
    const end = start + length

    const startPosition = diagnostic.file.getLineAndCharacterOfPosition(start)
    const endPosition = diagnostic.file.getLineAndCharacterOfPosition(end)

    // Фильтруем ошибки из node_modules
    const fileName = diagnostic.file.fileName
    if (fileName.includes("/node_modules/") || fileName.includes("\\node_modules\\")) {
      if (options.verbose) {
        console.error(`ℹ️ Пропущена ошибка из node_modules: ${fileName}`)
      }
      continue
    }

    // Преобразуем категорию TypeScript в severity VSCode
    const severityMap: Record<ts.DiagnosticCategory, number> = {
      [ts.DiagnosticCategory.Error]: 8, // Error
      [ts.DiagnosticCategory.Warning]: 4, // Warning
      [ts.DiagnosticCategory.Suggestion]: 2, // Information
      [ts.DiagnosticCategory.Message]: 1, // Hint
    }

    errors.push({
      file: filePath,
      line: startPosition.line + 1,
      column: startPosition.character + 1,
      endLine: endPosition.line + 1,
      endColumn: endPosition.character + 1,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      code: diagnostic.code.toString(),
      severity: severityMap[diagnostic.category] || 8,
      source: "ts",
      owner: "typescript",
      origin: "extHost5", // В точности как в примере VSCode
    })
  }

  if (options.verbose && errors.length > 0) {
    console.error(`📋 Найдено ошибок в ${filePath}: ${errors.length}`)
  }

  return errors
}
