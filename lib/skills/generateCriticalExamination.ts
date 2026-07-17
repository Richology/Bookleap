import { generateWithOllama } from "@/lib/ollama";
import { CRITICAL_EXAMINATION_PROMPT } from "@/lib/prompts/criticalExamination";

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
    .replace(/(?:^|\n)\s*(?:[-*+]\s*)?不\s*\n+\s*适用场景[：:]\s*/g, "\n\n不适用场景：\n")
    .replace(/(?:^|\n)\s*不适用场景[：:]\s*/g, "\n\n不适用场景：\n")
    .replace(/(?:^|\n)\s*适用场景[：:]\s*/g, "\n\n适用场景：\n")
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*-\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return `${before}\n${normalizedSection}${after}`;
}

export async function generateCriticalExamination(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = CRITICAL_EXAMINATION_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return normalizeBoundarySection(result.trim());
}
