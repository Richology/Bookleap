import { generateWithLLM } from '@/lib/llm';
import { selectionExplanationPrompt } from '@/lib/prompts/selectionExplanation';
import { explanationSources, parseExplanation } from '@/lib/bookAnalysis/selectionExplanation.mjs';
import type { StoredBookContext, BookContext } from '@/lib/bookAnalysis/context';

export async function generateSelectionExplanation(input: {title: string; selection: string; cardContent: string; context?: StoredBookContext | BookContext}) {
  const sources = explanationSources(input.context, input.selection);
  const raw = await generateWithLLM(selectionExplanationPrompt({title: input.title, selection: input.selection, cardContent: input.cardContent.slice(0, 12000), sources}));
  return parseExplanation(raw);
}
