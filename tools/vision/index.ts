import { $ } from "bun";
import chatPreset from "./presets/ai-chat-universal.json";

/**
 * Возвращает список универсальных селекторов для поиска в AI-чатах.
 * Используется для формирования запроса 'Targeted Search'.
 */
export function getUniversalChatSelectors() {
  return chatPreset.targets.map((t) => t.description);
}

/**
 * Преобразует нормализованные координаты (0.0-1.0) в пиксельные
 * на основе размеров скриншота.
 */
export async function getElementCoordinates(analysisResult: any, screenshotPath: string) {
  // Используем нативную утилиту macOS sips для получения размеров
  const output = await $`sips -g pixelWidth -g pixelHeight ${screenshotPath}`.text();
  
  const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
  
  const width = widthMatch ? parseInt(widthMatch[1]) : 0;
  const height = heightMatch ? parseInt(heightMatch[1]) : 0;

  if (!width || !height) {
    throw new Error(`Не удалось получить размеры изображения: ${screenshotPath}`);
  }

  // Поддержка обоих форматов (Targeted Search и General Analysis)
  const elements = analysisResult.found_elements || analysisResult.interface_elements || [];

  return elements.map((el: any) => {
    const { x_min, y_min, x_max, y_max } = el.position;
    
    const x = Math.floor(x_min * width);
    const y = Math.floor(y_min * height);
    const w = Math.floor((x_max - x_min) * width);
    const h = Math.floor((y_max - y_min) * height);

    return {
      ...el,
      pixels: {
        x,
        y,
        width: w,
        height: h,
        center: {
          x: x + Math.floor(w / 2),
          y: y + Math.floor(h / 2)
        }
      }
    };
  });
}

export { chatPreset };
