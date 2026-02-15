export interface DurationEstimationConfig {
  secondsPerImage: number;      // Default: 15
  wordsPerMinute: number;       // Default: 150
}

export const DEFAULT_DURATION_CONFIG: DurationEstimationConfig = {
  secondsPerImage: 15,
  wordsPerMinute: 150
};

/**
 * Count words in text (splits on whitespace)
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Estimate duration for image content
 * @returns Duration in seconds (default: 15)
 */
export function estimateImageDuration(
  config: Partial<DurationEstimationConfig> = {}
): number {
  return config.secondsPerImage ?? DEFAULT_DURATION_CONFIG.secondsPerImage;
}

/**
 * Estimate duration for text content based on word count
 * @param text - The text content
 * @param config - Optional configuration overrides
 * @returns Duration in seconds
 */
export function estimateTextDuration(
  text: string,
  config: Partial<DurationEstimationConfig> = {}
): number {
  const words = countWords(text);
  const wpm = config.wordsPerMinute ?? DEFAULT_DURATION_CONFIG.wordsPerMinute;
  return Math.ceil((words / wpm) * 60);
}

/**
 * Estimate duration based on media type
 * @param mediaType - "video" | "image" | "text"
 * @param options - Text content or word count for text estimation
 * @returns Duration in seconds (0 for video/unknown)
 */
export function estimateDuration(
  mediaType: "video" | "image" | "text",
  options?: {
    text?: string;
    wordCount?: number;
    config?: Partial<DurationEstimationConfig>;
  }
): number {
  const config = options?.config ?? {};

  switch (mediaType) {
    case "image": return estimateImageDuration(config);
    case "text":
      if (options?.wordCount) {
        const wpm = config.wordsPerMinute ?? DEFAULT_DURATION_CONFIG.wordsPerMinute;
        return Math.ceil((options.wordCount / wpm) * 60);
      }
      if (options?.text) {
        return estimateTextDuration(options.text, config);
      }
      return 0;
    case "video":
    default: return 0;
  }
}
