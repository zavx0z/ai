/**
 * Переводчик через Ollama API
 * Поддержка双向 перевода EN↔RU
 * 
 * Промпты определяются в Modelfile моделей (meta/zavx0z/Modelfile.*)
 */

import { OllamaClient, type ChatMessage } from 'ollama-client';

export type TranslateDirection = 'en-ru' | 'ru-en';
export type TranslateStyle = 'formal' | 'technical' | 'casual' | 'literary';

export interface TranslateOptions {
  direction: TranslateDirection;
  style?: TranslateStyle;
  model?: string;
  temperature?: number;
  timeout?: number;
}

/**
 * Маппинг стилей на специализированные модели
 * Если модель не создана — используется gemma2:2b с системным промптом
 */
const MODEL_MAP: Record<TranslateDirection, Record<TranslateStyle, string>> = {
  'en-ru': {
    formal: 'translator-en-ru',
    technical: 'translator-tech-en-ru',
    casual: 'gemma2:2b',
    literary: 'gemma2:2b',
  },
  'ru-en': {
    formal: 'translator-ru-en',
    technical: 'gemma2:2b',
    casual: 'gemma2:2b',
    literary: 'gemma2:2b',
  },
};

export class Translator {
  private client: OllamaClient;
  private direction: TranslateDirection;
  private style: TranslateStyle;
  private model: string;
  private temperature: number;

  constructor(options: TranslateOptions) {
    this.direction = options.direction;
    this.style = options.style || 'formal';
    // Если модель не указана — выбираем по маппингу стилей
    this.model = options.model || MODEL_MAP[this.direction][this.style];
    this.temperature = options.temperature ?? 0.3;

    this.client = new OllamaClient({
      baseUrl: 'http://localhost:11434',
      model: this.model,
      timeout: options.timeout,
    });
  }

  /**
   * Перевести текст
   */
  async translate(text: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        { role: 'user', content: text },
      ];

      const response = await this.client.chat({
        model: this.model,
        messages,
        options: {
          temperature: this.temperature,
        },
      });

      return response.message.content;
    } catch (error) {
      // Если модель не найдена (404), пробуем gemma2:2b
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`⚠️ Модель "${this.model}" не найдена. Используем gemma2:2b`);
        console.warn('   Установите модель: ollama pull gemma2:2b');
        
        const fallbackClient = new OllamaClient({
          baseUrl: 'http://localhost:11434',
          model: 'gemma2:2b',
        });
        
        const messages: ChatMessage[] = [
          { role: 'user', content: text },
        ];
        
        const response = await fallbackClient.chat({
          model: 'gemma2:2b',
          messages,
          options: {
            temperature: this.temperature,
          },
        });
        
        return response.message.content;
      }
      throw error;
    }
  }

  /**
   * Перевести текст со стримингом
   */
  async *translateStream(text: string): AsyncGenerator<string> {
    try {
      const messages: ChatMessage[] = [
        { role: 'user', content: text },
      ];

      for await (const chunk of this.client.chatStream({
        model: this.model,
        messages,
        options: {
          temperature: this.temperature,
        },
      })) {
        if (chunk.message.content) {
          yield chunk.message.content;
        }
      }
    } catch (error) {
      // Если модель не найдена (404), пробуем gemma2:2b
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`⚠️ Модель "${this.model}" не найдена. Используем gemma2:2b`);
        console.warn('   Установите модель: ollama pull gemma2:2b');
        
        const fallbackClient = new OllamaClient({
          baseUrl: 'http://localhost:11434',
          model: 'gemma2:2b',
        });
        
        const messages: ChatMessage[] = [
          { role: 'user', content: text },
        ];
        
        for await (const chunk of fallbackClient.chatStream({
          model: 'gemma2:2b',
          messages,
          options: {
            temperature: this.temperature,
          },
        })) {
          if (chunk.message.content) {
            yield chunk.message.content;
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Перевести файл (читает из stdin или файла)
   */
  async translateFile(input: string): Promise<string> {
    const text = input.startsWith('/')
      ? await Bun.file(input).text()
      : input;

    return this.translate(text);
  }
}

/**
 * Создать переводчик
 */
export function createTranslator(options: TranslateOptions): Translator {
  return new Translator(options);
}
