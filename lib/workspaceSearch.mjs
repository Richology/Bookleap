export function normalizeSearchText(value) {
  return value.trim().toLowerCase();
}

export function getSearchTokens(query) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function compactSearchText(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function getTextSearchMatch(haystack, query, tokens) {
  if (!haystack || tokens.length === 0) return null;

  const normalizedHaystack = normalizeSearchText(haystack);
  const normalizedQuery = normalizeSearchText(query);
  const tokenIndexes = tokens.map((token) => normalizedHaystack.indexOf(token));
  if (tokenIndexes.some((index) => index === -1)) return null;

  const phraseIndex = normalizedQuery ? normalizedHaystack.indexOf(normalizedQuery) : -1;
  const firstMatchIndex = phraseIndex >= 0 ? phraseIndex : Math.min(...tokenIndexes);
  const matchCount = tokens.reduce((total, token) => {
    let count = 0;
    let cursor = normalizedHaystack.indexOf(token);
    while (cursor >= 0) {
      count += 1;
      cursor = normalizedHaystack.indexOf(token, cursor + token.length);
    }
    return total + count;
  }, 0);

  return {
    score: (phraseIndex >= 0 ? 0 : 100) + firstMatchIndex,
    firstMatchIndex,
    matchCount,
  };
}

export function createSearchExcerpt(content, tokens, maxLength = 170) {
  const compact = compactSearchText(content);
  if (!compact) return "";
  if (tokens.length === 0) return compact.slice(0, maxLength);

  const lower = compact.toLowerCase();
  const matches = tokens
    .map((token) => ({ token, index: lower.indexOf(token) }))
    .filter((match) => match.index !== -1)
    .sort((a, b) => a.index - b.index);
  const firstMatch = matches[0];
  if (!firstMatch) return compact.slice(0, maxLength);

  return createSearchExcerptAt(compact, firstMatch.index, maxLength);
}

export function createSearchExcerptAt(content, matchIndex, maxLength = 180) {
  const compact = compactSearchText(content);
  if (!compact) return "";

  const start = Math.max(0, matchIndex - 56);
  const end = Math.min(compact.length, start + maxLength);
  return `${start > 0 ? "..." : ""}${compact.slice(start, end)}${end < compact.length ? "..." : ""}`;
}
