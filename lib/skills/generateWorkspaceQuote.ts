import { generateWithOllama } from "@/lib/ollama";
import { WORKSPACE_QUOTE_PROMPT } from "@/lib/prompts/workspaceQuote";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

function normalizeWorkspaceQuote(text: string): string {
  return text
    .replace(/^["'“”‘’「」『』]+|["'“”‘’「」『』]+$/g, "")
    .replace(
      /^(这本书的核心是[:：]\s*|这本书的关键是[:：]\s*|核心是[:：]\s*|关键是[:：]\s*|一句话概括[:：]\s*|如果压缩成一句话[:：]\s*|可以概括为[:：]\s*)/u,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

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
  return normalizeWorkspaceQuote(result);
}
