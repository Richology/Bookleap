import { generateWithOllama } from "@/lib/ollama";
import { VIEW_MAP_PROMPT } from "@/lib/prompts/viewMap";

export async function generateViewMap(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = VIEW_MAP_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return result.trim();
}
