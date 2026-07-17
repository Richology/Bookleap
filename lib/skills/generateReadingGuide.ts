import { generateWithOllama } from "@/lib/ollama";
import { READING_GUIDE_PROMPT } from "@/lib/prompts/readingGuide";
import { cleanupReadingGuideMarkdown } from "@/lib/skills/markdownCleanup.mjs";

export async function generateReadingGuide(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = READING_GUIDE_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return cleanupReadingGuideMarkdown(result.trim());
}
