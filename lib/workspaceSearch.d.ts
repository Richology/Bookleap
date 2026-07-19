export type TextSearchMatch = {
  score: number;
  firstMatchIndex: number;
  matchCount: number;
};

export function normalizeSearchText(value: string): string;
export function getSearchTokens(query: string): string[];
export function compactSearchText(value: string): string;
export function getTextSearchMatch(
  haystack: string,
  query: string,
  tokens: string[]
): TextSearchMatch | null;
export function createSearchExcerpt(content: string, tokens: string[], maxLength?: number): string;
export function createSearchExcerptAt(content: string, matchIndex: number, maxLength?: number): string;
