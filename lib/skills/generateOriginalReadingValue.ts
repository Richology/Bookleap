import { generateWithOllama } from "@/lib/ollama";
import { ORIGINAL_READING_VALUE_PROMPT } from "@/lib/prompts/originalReadingValue";

type ChapterSummaryInput = {
  title: string;
  summary?: string;
};

export async function generateOriginalReadingValue(
  title: string,
  bookSummary: string,
  readingGuide: string,
  chapters: ChapterSummaryInput[]
): Promise<string> {
  const summariesText = chapters
    .map((chapter, index) => {
      const chapterTitle = chapter.title || `第 ${index + 1} 章`;
      const summary = chapter.summary || "";
      return `${index + 1}. ${chapterTitle}\n${summary}`;
    })
    .join("\n\n");
  const prompt = ORIGINAL_READING_VALUE_PROMPT(
    title,
    bookSummary,
    readingGuide,
    summariesText
  );
  const result = await generateWithOllama(prompt);
  return result.trim();
}
