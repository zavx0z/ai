#!/usr/bin/env bun
/**
 * CLI для перевода через Ollama
 * 
 * Использование:
 *   bun translate "text to translate" --direction en-ru --style formal
 *   bun translate input.txt --direction ru-en --style technical
 *   echo "text" | bun translate --direction en-ru
 */

import { createTranslator, type TranslateDirection, type TranslateOptions } from './index.ts';

function printHelp(): void {
  console.log(`
🔄 Переводчик через Ollama

Использование:
  bun translate <text> [опции]
  bun translate <file> [опции]
  echo "text" | bun translate [опции]

Опции:
  --direction, -d  Направление перевода: en-ru (по умолчанию) или ru-en
  --style, -s      Стиль перевода: formal (по умолчанию), technical, casual, literary
  --model, -m      Модель Ollama (по умолчанию: gemma2:2b)
  --stream         Использовать стриминг
  --help, -h       Показать эту справку

Примеры:
  bun translate "Hello world" -d en-ru -s formal
  bun translate input.txt -d ru-en -s technical
  bun translate document.md --stream
`);
}

function parseArgs(args: string[]): {
  text?: string;
  direction: TranslateDirection;
  style: TranslateOptions['style'];
  model?: string;
  stream: boolean;
  help: boolean;
} {
  const result = {
    text: undefined as string | undefined,
    direction: 'en-ru' as TranslateDirection,
    style: 'formal' as TranslateOptions['style'],
    model: undefined as string | undefined,
    stream: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--direction' || arg === '-d') {
      const val = args[++i];
      if (val) result.direction = val as TranslateDirection;
    } else if (arg === '--style' || arg === '-s') {
      const val = args[++i];
      if (val) result.style = val as TranslateOptions['style'];
    } else if (arg === '--model' || arg === '-m') {
      const val = args[++i];
      if (val) result.model = val;
    } else if (arg === '--stream') {
      result.stream = true;
    } else if (!arg.startsWith('-') && !result.text) {
      result.text = arg;
    }

    i++;
  }

  return result;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Проверка доступности Ollama
  const { OllamaClient } = await import('ollama-client');
  const client = new OllamaClient();
  const available = await client.isAvailable();

  if (!available) {
    console.error('❌ Ollama недоступна. Запустите: ollama serve');
    process.exit(1);
  }

  // Получение текста для перевода
  let text = options.text;

  if (!text) {
    // Чтение из stdin если есть пайп
    if (process.stdin.isTTY === false) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      text = Buffer.concat(chunks).toString('utf-8');
    }
  }

  if (!text) {
    console.error('❌ Укажите текст для перевода или передайте через stdin');
    console.error('   Используйте --help для справки');
    process.exit(1);
  }

  // Создание переводчика
  const translator = createTranslator({
    direction: options.direction,
    style: options.style,
    model: options.model,
  });

  // Перевод
  if (options.stream) {
    let result = '';
    for await (const chunk of translator.translateStream(text)) {
      process.stdout.write(chunk);
      result += chunk;
    }
    console.log();
  } else {
    const result = await translator.translate(text);
    console.log(result);
  }
}

main().catch((error) => {
  console.error('Ошибка:', error.message);
  process.exit(1);
});
