import { generateWithOllama } from "@/lib/ollama";
import { CRITICAL_EXAMINATION_PROMPT } from "@/lib/prompts/criticalExamination";
import { cleanupCriticalExaminationMarkdown } from "@/lib/skills/markdownCleanup.mjs";

export async function generateCriticalExamination(
  title: string,
  bookSummary: string,
  analysisContext: string
): Promise<string> {
  const prompt = CRITICAL_EXAMINATION_PROMPT(title, bookSummary, analysisContext);
  const result = await generateWithOllama(prompt);
  return cleanupCriticalExaminationMarkdown(result.trim());
}
