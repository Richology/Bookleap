import { generateWithOllama } from "@/lib/ollama";
import { ACTION_EXTRACTION_PROMPT } from "@/lib/prompts/actionExtraction";
import { cleanupActionExtractionMarkdown } from "@/lib/skills/markdownCleanup.mjs";

export async function generateActionExtraction(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = ACTION_EXTRACTION_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return cleanupActionExtractionMarkdown(result.trim());
}
