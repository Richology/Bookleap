import { generateWithOllama } from "@/lib/ollama";
import { CHAPTER_SUMMARY_PROMPT } from "@/lib/prompts/chapterSummary";

type ChapterInput = {
  id: string;
  title: string;
  text: string;
};

type ChapterWithSummary = ChapterInput & {
  summary: string;
};

export async function generateChapterSummaries(
  chapters: ChapterInput[]
): Promise<ChapterWithSummary[]> {
  return Promise.all(
    chapters.map(async (chapter) => {
      const prompt = CHAPTER_SUMMARY_PROMPT(chapter.title, chapter.text);
      const result = await generateWithOllama(prompt);

      return {
        ...chapter,
        summary: result.trim(),
      };
    })
  );
}
