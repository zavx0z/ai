# 📜 Правила для AI-агента по созданию терминальных приложений на Bun

## 🎯 **АРХИТЕКТУРНЫЕ ПРИНЦИПЫ**

### **ПРИНЦИП 1: Всегда использовать Bun.Terminal API**

```javascript
// ✅ ПРАВИЛЬНО (интерактивные программы)
const proc = Bun.spawn(["vim", "file.txt"], {
  terminal: {  // ← Обязательно использовать terminal
    cols: 80,
    rows: 24,
    data(term, data) { process.stdout.write(data); }
  }
});

// ❌ ЗАПРЕЩЕНО (для интерактивных программ)
const proc = Bun.spawn(["vim"], {
  stdout: "pipe"  // vim не будет работать!
});
```

### **ПРИНЦИП 2: Проверять аргументы и платформу**

```javascript
class TerminalApp {
  constructor() {
    // 1. Проверка ОС (ТРЕБУЕТСЯ ВСЕГДА)
    if (process.platform === "win32") {
      console.error("❌ PTY не поддерживается на Windows");
      process.exit(1);
    }
    
    // 2. Проверка аргументов (ТРЕБУЕТСЯ ВСЕГДА)
    if (process.argv.length < 3) {
      console.error("❌ Использование: bun <скрипт> <команда> [аргументы...]");
      console.log("📝 Пример: bun index.ts bash");
      process.exit(1);
    }
  }
}
```

## 📋 **ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА**

### **ПРАВИЛО 1: Базовая структура класса (ШАБЛОН)**

```javascript
#!/usr/bin/env bun

class TerminalApp {
  constructor() {
    this.proc = null;
    this.setupSignalHandlers();  // ← ОБЯЗАТЕЛЬНО
  }
  
  async run(command, args = []) {
    // ВАЛИДАЦИЯ: проверка команды
    if (!command || command === "undefined") {
      throw new Error("Команда не указана");
    }
    
    try {
      // СОЗДАНИЕ PTY
      this.proc = Bun.spawn([command, ...args], {
        terminal: this.createTerminalConfig()
      });
      
      // НАСТРОЙКА
      this.setupInput();
      this.setupResize();
      
      // ОЖИДАНИЕ
      return await this.proc.exited;
      
    } finally {
      this.cleanup();  // ← ОБЯЗАТЕЛЬНО в finally
    }
  }
  
  createTerminalConfig() {
    return {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data: (term, data) => this.onTerminalData(term, data)
    };
  }
}
```

### **ПРАВИЛО 2: Управление вводом (ОБЯЗАТЕЛЬНО)**

```javascript
setupInput() {
  // 1. Включить raw mode (ОБЯЗАТЕЛЬНО)
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  
  // 2. Обработка Ctrl+C (ОБЯЗАТЕЛЬНО)
  process.stdin.on('data', (key) => {
    if (key === '\u0003') this.exitGracefully();
    this.proc.terminal.write(key);
  });
  
  // 3. Активировать stdin
  process.stdin.resume();
}
```

### **ПРАВИЛО 3: Изменение размера (ОБЯЗАТЕЛЬНО)**

```javascript
setupResize() {
  process.stdout.on('resize', () => {
    this.proc.terminal.resize(
      process.stdout.columns || 80,
      process.stdout.rows || 24
    );
  });
}
```

### **ПРАВИЛО 4: Обработка сигналов (ОБЯЗАТЕЛЬНО)**

```javascript
setupSignalHandlers() {
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
    process.on(signal, () => this.exitGracefully());
  });
}

exitGracefully() {
  this.cleanup();
  process.exit(0);
}
```

### **ПРАВИЛО 5: Гарантированная очистка (ОБЯЗАТЕЛЬНО)**

```javascript
cleanup() {
  // 1. Закрыть терминал
  if (this.proc?.terminal) {
    this.proc.terminal.close();
  }
  
  // 2. Вернуть нормальный режим stdin
  process.stdin.setRawMode(false);
  
  // 3. Удалить обработчики
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGHUP');
}
```

## 🛡 **ПРАВИЛА БЕЗОПАСНОСТИ**

### **ПРАВИЛО БЕЗОПАСНОСТИ 1: Валидация команд**

```javascript
// ✅ БЕЗОПАСНО
const ALLOWED_COMMANDS = ["bash", "zsh", "vim", "nano", "top", "htop"];

function validateCommand(command) {
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(`Команда "${command}" не разрешена`);
  }
}

// В методе run():
validateCommand(command);
```

### **ПРАВИЛО БЕЗОПАСНОСТИ 2: Изоляция окружения**

```javascript
Bun.spawn([command, ...args], {
  terminal: { /* ... */ },
  env: {
    // Минимальный безопасный набор
    PATH: "/usr/bin:/bin",
    USER: process.env.USER || "guest",
    HOME: "/tmp",
    TERM: "xterm-256color"
  },
  cwd: "/tmp"  // Изолированная директория
});
```

## 🔧 **ПРАВИЛА ПРОИЗВОДИТЕЛЬНОСТИ**

### **ПРАВИЛО ПРОИЗВОДИТЕЛЬНОСТИ 1: Буферизация вывода**

```javascript
class BufferedTerminalApp extends TerminalApp {
  constructor(bufferSize = 4096) {
    super();
    this.buffer = [];
    this.bufferSize = bufferSize;
  }
  
  onTerminalData(terminal, data) {
    this.buffer.push(data);
    
    if (this.buffer.length >= this.bufferSize) {
      process.stdout.write(this.buffer.join(''));
      this.buffer = [];
    }
  }
  
  cleanup() {
    // Сброс буфера при завершении
    if (this.buffer.length > 0) {
      process.stdout.write(this.buffer.join(''));
    }
    super.cleanup();
  }
}
```

### **ПРАВИЛО ПРОИЗВОДИТЕЛЬНОСТИ 2: Пул терминалов**

```javascript
class TerminalPool {
  constructor(maxSize = 5) {
    this.pool = [];
    this.maxSize = maxSize;
  }
  
  async getTerminal() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new Bun.Terminal({
      cols: 80,
      rows: 24,
      data: (term, data) => process.stdout.write(data)
    });
  }
  
  releaseTerminal(terminal) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(terminal);
    } else {
      terminal.close();
    }
  }
}
```

## 🧪 **ПРАВИЛА ТЕСТИРОВАНИЯ**

### **ПРАВИЛО ТЕСТИРОВАНИЯ 1: Мок PTY для тестов**

```javascript
// test/mock-terminal.js
export class MockTerminal {
  constructor(config) {
    this.config = config;
    this.output = [];
  }
  
  write(data) {
    this.output.push(data);
  }
  
  close() {
    this.output = [];
  }
}

// В тестах:
import { MockTerminal } from './mock-terminal.js';
import { spyOn } from 'bun:test';

spyOn(Bun, 'spawn').mockImplementation((command, options) => {
  return {
    terminal: new MockTerminal(options.terminal),
    exited: Promise.resolve(0)
  };
});
```

### **ПРАВИЛО ТЕСТИРОВАНИЯ 2: Интеграционные тесты**

```javascript
import { test, expect } from 'bun:test';
import { spawn } from 'child_process';

test('PTY запускает bash', async () => {
  const proc = spawn('bun', ['index.ts', 'bash', '-c', 'echo "test"']);
  
  let output = '';
  proc.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  proc.kill();
  
  expect(output).toContain('test');
});
```

## 🎨 **ПРАВИЛА ПОЛЬЗОВАТЕЛЬСКОГО ОПЫТА**

### **ПРАВИЛО UX 1: Поддержка ANSI-цветов**

```javascript
onTerminalData(terminal, data) {
  // Сохраняем все ANSI-последовательности
  process.stdout.write(data);
}

// В конфигурации:
env: {
  ...process.env,
  COLORTERM: 'truecolor',
  TERM: 'xterm-256color'
}
```

### **ПРАВИЛО UX 2: История команд**

```javascript
class HistoryTerminalApp extends TerminalApp {
  constructor() {
    super();
    this.history = [];
    this.historyIndex = -1;
  }
  
  setupInput() {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      // Стрелка вверх
      if (key === '\u001b[A') {
        const cmd = this.getPreviousCommand();
        if (cmd) this.proc.terminal.write(cmd);
      }
      // Стрелка вниз
      else if (key === '\u001b[B') {
        const cmd = this.getNextCommand();
        if (cmd) this.proc.terminal.write(cmd);
      }
      // Enter - сохраняем команду
      else if (key === '\r') {
        this.saveCurrentCommand();
        this.proc.terminal.write('\n');
      }
      else {
        this.proc.terminal.write(key);
      }
    });
    
    process.stdin.resume();
  }
}
```

## 📦 **ПРАВИЛА ДЕПЛОЯ**

### **ПРАВИЛО ДЕПЛОЯ 1: Упаковка в бинарник**

```javascript
// package.json
{
  "name": "my-terminal-app",
  "bin": {
    "my-term": "./dist/index.js"
  },
  "scripts": {
    "build": "bun build ./index.ts --outdir ./dist --target bun",
    "compile": "bun build --compile ./index.ts --outfile my-terminal-app"
  }
}

// Сборка:
// bun run build        # для запуска через bun
// bun run compile      # standalone бинарник
```

### **ПРАВИЛО ДЕПЛОЯ 2: Конфигурация через .env**

```javascript
import { config } from 'dotenv';
config();

class ConfigurableTerminalApp extends TerminalApp {
  createTerminalConfig() {
    return {
      cols: parseInt(process.env.TERMINAL_COLS) || 80,
      rows: parseInt(process.env.TERMINAL_ROWS) || 24,
      data: (term, data) => {
        if (process.env.LOG_OUTPUT === 'true') {
          this.logOutput(data);
        }
        process.stdout.write(data);
      }
    };
  }
}
```

## 🚨 **КРИТИЧЕСКИЕ ОШИБКИ И ИХ РЕШЕНИЯ**

### **ОШИБКА 1: "Executable not found in $PATH: undefined"**

**ПРИЧИНА:** Не проверены аргументы командной строки  
**РЕШЕНИЕ:** Всегда добавлять проверку:

```javascript
if (process.argv.length < 3) {
  console.error("❌ Использование: bun <скрипт> <команда>");
  process.exit(1);
}
```

### **ОШИБКА 2: "PTY не работает на Windows"**

**ПРИЧИНА:** Bun.Terminal не поддерживает Windows  
**РЕШЕНИЕ:** Добавлять проверку платформы:

```javascript
if (process.platform === "win32") {
  console.error("❌ Используйте WSL или Linux/macOS");
  process.exit(1);
}
```

### **ОШИБКА 3: "Raw mode не работает"**

**ПРИЧИНА:** Не вызван `process.stdin.resume()`  
**РЕШЕНИЕ:** Всегда завершать настройку:

```javascript
setupInput() {
  process.stdin.setRawMode(true);
  // ... обработчики ...
  process.stdin.resume();  // ← ОБЯЗАТЕЛЬНО
}
```

## 📖 **ПОЛНЫЙ ШАБЛОН ДЛЯ КОПИРОВАНИЯ**

```javascript
#!/usr/bin/env bun
/**
 * ФИНАЛЬНЫЙ ШАБЛОН PTY-приложения на Bun
 * AI-агент ДОЛЖЕН использовать этот шаблон
 */

class TerminalApp {
  constructor() {
    // 1. Проверка платформы (ОБЯЗАТЕЛЬНО)
    if (process.platform === "win32") {
      console.error("❌ PTY не поддерживается на Windows");
      process.exit(1);
    }
    
    // 2. Проверка аргументов (ОБЯЗАТЕЛЬНО)
    if (process.argv.length < 3) {
      console.error("❌ Использование: bun <скрипт> <команда> [аргументы...]");
      console.log("📝 Пример: bun index.ts bash");
      console.log("📝 Пример: bun index.ts vim file.txt");
      process.exit(1);
    }
    
    this.proc = null;
    this.setupSignalHandlers();
  }
  
  async run(command, args = []) {
    // 3. Валидация команды (ОБЯЗАТЕЛЬНО)
    if (!command || command === "undefined") {
      throw new Error("Команда не указана");
    }
    
    try {
      // 4. Создание PTY (ОБЯЗАТЕЛЬНО через terminal)
      this.proc = Bun.spawn([command, ...args], {
        terminal: {
          cols: process.stdout.columns || 80,
          rows: process.stdout.rows || 24,
          data: (term, data) => this.onTerminalData(term, data)
        },
        env: { ...process.env, TERM: "xterm-256color" }
      });
      
      // 5. Настройка (ОБЯЗАТЕЛЬНО)
      this.setupInput();
      this.setupResize();
      
      // 6. Ожидание завершения
      return await this.proc.exited;
      
    } finally {
      // 7. Очистка (ОБЯЗАТЕЛЬНО в finally)
      this.cleanup();
    }
  }
  
  onTerminalData(terminal, data) {
    process.stdout.write(data);
  }
  
  setupInput() {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      // Ctrl+C для выхода
      if (key === '\u0003') this.exitGracefully();
      this.proc.terminal.write(key);
    });
    
    process.stdin.resume();
  }
  
  setupResize() {
    process.stdout.on('resize', () => {
      this.proc.terminal.resize(
        process.stdout.columns || 80,
        process.stdout.rows || 24
      );
    });
  }
  
  setupSignalHandlers() {
    ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
      process.on(signal, () => this.exitGracefully());
    });
  }
  
  exitGracefully() {
    this.cleanup();
    process.exit(0);
  }
  
  cleanup() {
    if (this.proc?.terminal) {
      this.proc.terminal.close();
    }
    process.stdin.setRawMode(false);
  }
}

// 8. Запуск приложения (ОБЯЗАТЕЛЬНО с проверкой)
const app = new TerminalApp();
const command = process.argv[2];
const args = process.argv.slice(3);

app.run(command, args).catch(error => {
  console.error("🔥 Ошибка:", error.message);
  process.exit(1);
});
```

## ✅ **ЧЕК-ЛИСТ ПЕРЕД ВЫПУСКОМ**

AI-агент должен проверить:

1. [ ] **Платформа:** Проверка `process.platform !== "win32"`
2. [ ] **Аргументы:** Проверка `process.argv.length >= 3`
3. [ ] **PTY config:** Использование `terminal: {}` вместо `stdio`
4. [ ] **Raw mode:** Вызов `process.stdin.setRawMode(true)`
5. [ ] **Resume stdin:** Вызов `process.stdin.resume()`
6. [ ] **Ctrl+C:** Обработка `\u0003`
7. [ ] **Resize:** Обработчик `process.stdout.on('resize')`
8. [ ] **Сигналы:** Обработка SIGINT, SIGTERM
9. [ ] **Очистка:** Метод `cleanup()` в `finally`
10. [ ] **Выход:** `process.exit()` при ошибках

## 🎓 **ЗАКЛЮЧИТЕЛЬНОЕ ПРАВИЛО**

**AI-агент ВСЕГДА должен:**  

1. Использовать предоставленный шаблон как основу  
2. Добавлять проверку платформы и аргументов  
3. Гарантировать очистку ресурсов в `finally`  
4. Тестировать код перед выдачей (хотя бы мысленно)

Эти правила гарантируют создание **рабочих, безопасных и надежных** терминальных приложений на Bun с PTY-поддержкой.
