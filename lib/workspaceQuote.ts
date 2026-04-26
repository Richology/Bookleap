const CONTENT_LABELS = [
  "如果压缩成一句话",
  "这本书的核心是",
  "这本书的关键是",
  "一句话概括",
  "一句话总结",
  "可以概括为",
  "核心问题",
  "核心观点",
  "核心命题",
  "核心结论",
  "核心启发",
  "关键观点",
  "关键问题",
  "关键一句",
  "核心是",
  "关键是",
  "金句",
] as const;

const METADATA_LABELS = [
  "书名",
  "作者",
  "作者名",
  "书籍",
  "作品",
  "标题",
  "book",
  "title",
] as const;

const ANY_LABEL_PATTERN = [...CONTENT_LABELS, ...METADATA_LABELS].join("|");
const CONTENT_LABEL_PATTERN = new RegExp(`(?:${CONTENT_LABELS.join("|")})[:：]\\s*`, "gu");
const LEADING_METADATA_PATTERN = new RegExp(
  `^(?:${METADATA_LABELS.join("|")})[:：]\\s*[^:：\\n]+?(?=(?:\\s+(?:${ANY_LABEL_PATTERN})[:：])|$)`,
  "u"
);
const GENERIC_PREFIX_PATTERN =
  /^(这本书的核心是[:：]\s*|这本书的关键是[:：]\s*|核心是[:：]\s*|关键是[:：]\s*|一句话概括[:：]\s*|如果压缩成一句话[:：]\s*|可以概括为[:：]\s*)/u;

export function sanitizeWorkspaceQuote(text: string): string {
  let normalized = text
    .replace(/\*\*|__|`/g, " ")
    .replace(/^[\s>*#-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  while (LEADING_METADATA_PATTERN.test(normalized)) {
    normalized = normalized.replace(LEADING_METADATA_PATTERN, "").trimStart();
  }

  const matches = Array.from(normalized.matchAll(CONTENT_LABEL_PATTERN));
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const matchIndex = lastMatch.index ?? 0;
    normalized = normalized.slice(matchIndex + lastMatch[0].length);
  }

  normalized = normalized
    .replace(GENERIC_PREFIX_PATTERN, "")
    .replace(/^["'“”‘’「」『』]+|["'“”‘’「」『』]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}
