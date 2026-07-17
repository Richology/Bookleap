import { generateWithOllama } from "@/lib/ollama";
import { BOOK_SUMMARY_PROMPT } from "@/lib/prompts/bookSummary";

export async function generateBookSummary(
  title: string,
  analysisContext: string
): Promise<string> {
  const prompt = BOOK_SUMMARY_PROMPT(title, analysisContext);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
