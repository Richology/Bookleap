import { generateWithOllama } from "@/lib/ollama";
import { CRITICAL_EXAMINATION_PROMPT } from "@/lib/prompts/criticalExamination";

type ChapterSummaryItem = {
  index: number;
  title: string;
  summary: string;
};

function normalizeBoundarySection(markdown: string): string {
  const marker = "## 适用边界";
  const start = markdown.indexOf(marker);

  if (start === -1) return markdown;

  const sectionStart = start + marker.length;
  const nextSectionStart = markdown.indexOf("\n## ", sectionStart);
  const before = markdown.slice(0, sectionStart);
  const section = nextSectionStart === -1
    ? markdown.slice(sectionStart)
    : markdown.slice(sectionStart, nextSectionStart);
  const after = nextSectionStart === -1 ? "" : markdown.slice(nextSectionStart);

  const normalizedSection = section
    .replace(/\n{0,2}适用场景[：:]\s*/g, "\n\n适用场景：\n")
    .replace(/\n{0,2}不适用场景[：:]\s*/g, "\n\n不适用场景：\n")
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*-\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return `${before}\n${normalizedSection}${after}`;
}

export async function generateCriticalExamination(
  title: string,
  bookSummary: string,
  chapterSummaries: ChapterSummaryItem[]
): Promise<string> {
  const summariesText = chapterSummaries
    .map((item) => `第${item.index}章：${item.title}\n摘要：${item.summary}`)
    .join("\n\n");

  const prompt = CRITICAL_EXAMINATION_PROMPT(title, bookSummary, summariesText);
  const result = await generateWithOllama(prompt);
  return normalizeBoundarySection(result.trim());
}
