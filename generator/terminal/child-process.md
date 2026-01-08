# Документация Bun - Дочерние процессы

[актуальная документация](https://bun.com/docs/runtime/child-process)

## Обзор

Bun предоставляет API для создания и управления дочерними процессами через `Bun.spawn` и `Bun.spawnSync`. Эти API спроектированы для простоты использования и высокой производительности.

## Быстрый старт

### Асинхронный spawn

```javascript
const proc = Bun.spawn(["echo", "Hello"]);
const text = await new Response(proc.stdout).text();
console.log(text); // "Hello"
```

### Синхронный spawn

```javascript
const proc = Bun.spawnSync(["echo", "Hello"]);
console.log(proc.stdout.toString()); // "Hello"
```

## Bun.spawn

### Сигнатура

```typescript
Bun.spawn(
  command: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    stdio?: Array<"pipe" | "inherit" | "ignore"> | Record<"stdin" | "stdout" | "stderr", "pipe" | "inherit" | "ignore">;
    stdin?: "pipe" | "inherit" | "ignore" | BunFile | number | ArrayBufferView;
    stdout?: "pipe" | "inherit" | "ignore" | BunFile | number;
    stderr?: "pipe" | "inherit" | "ignore" | BunFile | number;
    onExit?: (proc: Bun.Subprocess, exitCode: number, signalCode: number) => void | Promise<void>;
  }
): Bun.Subprocess
```

### Базовые примеры

#### Запуск команды и чтение вывода

```javascript
const proc = Bun.spawn(["echo", "Hello, world!"]);
const output = await new Response(proc.stdout).text();
console.log(output); // "Hello, world!"
```

#### Перехват stderr

```javascript
const proc = Bun.spawn(["ls", "несуществующий_файл"], {
  stderr: "pipe",
});
const error = await new Response(proc.stderr).text();
console.log(error); // "ls: несуществующий_файл: No such file or directory"
```

## Bun.spawnSync

### Сигнатура

```typescript
Bun.spawnSync(
  command: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    stdio?: Array<"pipe" | "inherit" | "ignore"> | Record<"stdin" | "stdout" | "stderr", "pipe" | "inherit" | "ignore">;
    stdin?: "pipe" | "inherit" | "ignore" | BunFile | number | ArrayBufferView;
  }
): {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
  success: boolean;
}
```

### Пример

```javascript
const result = Bun.spawnSync(["echo", "Hello"]);
console.log(result.stdout.toString()); // "Hello"
console.log(result.success); // true
```

## Управление вводом/выводом

### Опции stdio

```javascript
// Все три потока в pipe (по умолчанию)
const proc1 = Bun.spawn(["cmd"], {
  stdio: ["pipe", "pipe", "pipe"]
});

// Только stdout в pipe
const proc2 = Bun.spawn(["cmd"], {
  stdio: ["ignore", "pipe", "inherit"]
});

// Альтернативный синтаксис
const proc3 = Bun.spawn(["cmd"], {
  stdin: "pipe",
  stdout: "pipe",
  stderr: "inherit"
});
```

### Запись в stdin

```javascript
const proc = Bun.spawn(["cat"], {
  stdin: "pipe",
  stdout: "pipe"
});

proc.stdin.write("Hello from stdin!");
proc.stdin.end();

const output = await new Response(proc.stdout).text();
console.log(output); // "Hello from stdin!"
```

### Использование файлов

```javascript
const inputFile = Bun.file("input.txt");
const outputFile = Bun.file("output.txt", { create: true });

const proc = Bun.spawn(["grep", "pattern"], {
  stdin: inputFile,
  stdout: outputFile
});

await proc.exited;
```

## Управление процессами

### Ожидание завершения

```javascript
const proc = Bun.spawn(["sleep", "2"]);

// Асинхронное ожидание
await proc.exited;
console.log("Процесс завершён");

// Или через промис
proc.exited.then(() => {
  console.log("Процесс завершён");
});
```

### Получение кода выхода

```javascript
const proc = Bun.spawn(["false"]);
await proc.exited;
console.log(proc.exitCode); // 1
console.log(proc.signalCode); // null
```

### Принудительное завершение

```javascript
const proc = Bun.spawn(["sleep", "10"]);

// SIGTERM (корректное завершение)
proc.kill();

// SIGKILL (немедленное завершение)
proc.kill("SIGKILL");

// По ID процесса
proc.kill(proc.pid);
```

### Обработка выхода

```javascript
const proc = Bun.spawn(["some-command"], {
  onExit: async (proc, exitCode, signalCode) => {
    console.log(`Процесс завершён с кодом ${exitCode}`);
    // Очистка ресурсов
  }
});
```

## Работа с выводами

### Потоковое чтение

```javascript
const proc = Bun.spawn(["yes"], {
  stdout: "pipe"
});

for await (const chunk of proc.stdout) {
  console.log(new TextDecoder().decode(chunk));
  proc.kill(); // остановить бесконечный вывод
}
```

### Преобразование в Response

```javascript
const proc = Bun.spawn(["curl", "https://example.com"]);
const response = await new Response(proc.stdout);
const html = await response.text();
```

### Перенаправление вывода

```javascript
// В файл
const proc1 = Bun.spawn(["ls", "-la"], {
  stdout: Bun.file("output.txt")
});

// В родительский процесс
const proc2 = Bun.spawn(["node", "--version"], {
  stdout: "inherit" // выводится в консоль родителя
});
```

## Переменные окружения и рабочий каталог

```javascript
const proc = Bun.spawn(["env"], {
  cwd: "/path/to/dir",
  env: {
    ...process.env,
    CUSTOM_VAR: "value"
  }
});

const output = await new Response(proc.stdout).text();
console.log(output.includes("CUSTOM_VAR=value")); // true
```

## Subprocess API

Объект `Bun.Subprocess` предоставляет:

### Свойства

```typescript
interface Subprocess {
  readonly pid: number;
  readonly stdin: WritableStream | null;
  readonly stdout: ReadableStream | null;
  readonly stderr: ReadableStream | null;
  readonly exited: Promise<number>;
  readonly exitCode: number | null;
  readonly signalCode: number | null;
  
  kill(signal?: number | string): void;
  ref(): void;
  unref(): void;
}
```

### Контроль жизненного цикла процесса

```javascript
const proc = Bun.spawn(["long-running-task"]);

// Убрать ссылку (процесс не будет удерживать программу)
proc.unref();

// Вернуть ссылку
proc.ref();
```

## Практические примеры

### Выполнение shell-команд

```javascript
async function runCommand(cmd, args = []) {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe"
  });
  
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  
  const exitCode = await proc.exited;
  
  return { stdout, stderr, exitCode };
}

const result = await runCommand("ls", ["-la"]);
```

### Конвейер процессов

```javascript
const cat = Bun.spawn(["cat", "large-file.txt"], {
  stdout: "pipe"
});

const grep = Bun.spawn(["grep", "pattern"], {
  stdin: cat.stdout,
  stdout: "pipe"
});

const result = await new Response(grep.stdout).text();
```

### Таймаут выполнения

```javascript
async function spawnWithTimeout(command, timeoutMs) {
  const proc = Bun.spawn(command);
  const timeout = Bun.sleep(timeoutMs);
  
  const result = await Promise.race([
    proc.exited.then(() => "completed"),
    timeout.then(() => "timeout")
  ]);
  
  if (result === "timeout") {
    proc.kill();
    throw new Error("Таймаут выполнения");
  }
  
  return proc.exitCode;
}
```

## Лучшие практики

### 1. Всегда обрабатывайте stderr

```javascript
const proc = Bun.spawn(["risky-command"], {
  stderr: "pipe"
});
```

### 2. Очищайте ресурсы

```javascript
const proc = Bun.spawn(["command"]);
try {
  await proc.exited;
} finally {
  // Принудительно закрываем потоки если нужно
}
```

### 3. Используйте `onExit` для очистки

```javascript
Bun.spawn(["server"], {
  onExit: async () => {
    await cleanupResources();
  }
});
```

### 4. Избегайте deadlocks при работе с pipes

```javascript
// Неправильно - может привести к deadlock
const proc = Bun.spawn(["command"]);
proc.stdin.write("data");
const output = await new Response(proc.stdout).text();

// Правильно - читать и писать асинхронно
proc.stdin.write("data");
proc.stdin.end();
const output = await new Response(proc.stdout).text();
```

## Совместимость с Node.js

Bun поддерживает большинство API Node.js `child_process`, но `Bun.spawn` рекомендуется для лучшей производительности и интеграции с экосистемой Bun.

## Безопасность

### 1. Валидация входных данных

```javascript
// Небезопасно
const userInput = "rm -rf /";
Bun.spawn(["sh", "-c", userInput]);

// Безопасно - не используйте shell с пользовательским вводом
const args = userInput.split(" ");
Bun.spawn(args); // Без shell инъекций
```

### 2. Ограничение прав

```javascript
// Используйте отдельного пользователя если нужно
Bun.spawn(["sudo", "-u", "nobody", "command"]);
```

## Устранение неполадок

### Процесс не завершается

```javascript
const proc = Bun.spawn(["command"]);
// ...
proc.kill(); // Принудительное завершение
```

### Проблемы с кодировкой

```javascript
const proc = Bun.spawn(["command"]);
const buffer = await proc.stdout.arrayBuffer();
const text = new TextDecoder("utf-8").decode(buffer);
```

### Отладка

```javascript
const proc = Bun.spawn(["command"], {
  stdio: "inherit" // Видеть все выводы в реальном времени
});
```

## Производительность

`Bun.spawn` оптимизирован для:

- Минимального overhead при создании процессов
- Эффективной работы с потоками
- Низкого потребления памяти

Для большинства сценариев `Bun.spawn` быстрее аналогов в Node.js.
