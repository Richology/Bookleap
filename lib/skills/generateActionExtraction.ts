import { generateWithOllama } from "@/lib/ollama";
import { ACTION_EXTRACTION_PROMPT } from "@/lib/prompts/actionExtraction";

export async function generateActionExtraction(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = ACTION_EXTRACTION_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
