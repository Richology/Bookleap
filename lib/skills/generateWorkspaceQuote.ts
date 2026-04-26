import { generateWithOllama } from "@/lib/ollama";
import { WORKSPACE_QUOTE_PROMPT } from "@/lib/prompts/workspaceQuote";
import { sanitizeWorkspaceQuote } from "@/lib/workspaceQuote";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

export async function generateWorkspaceQuote(
  title: string,
  bookSummary: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const context = chapterSummaries
    .slice(0, 3)
    .map((item) => `第${item.index}章：${item.title}\n${item.summary}`)
    .join("\n\n");

  const prompt = WORKSPACE_QUOTE_PROMPT(title, bookSummary, context);
  const result = await generateWithOllama(prompt);
  return sanitizeWorkspaceQuote(result, { title });
}
