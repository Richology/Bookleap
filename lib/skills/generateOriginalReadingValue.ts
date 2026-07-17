import { generateWithOllama } from "@/lib/ollama";
import { ORIGINAL_READING_VALUE_PROMPT } from "@/lib/prompts/originalReadingValue";

export async function generateOriginalReadingValue(
  title: string,
  bookSummary: string,
  readingGuide: string,
  analysisContext: string
): Promise<string> {
  const prompt = ORIGINAL_READING_VALUE_PROMPT(
    title,
    bookSummary,
    readingGuide,
    analysisContext
  );
  const result = await generateWithOllama(prompt);
  return result.trim();
}
