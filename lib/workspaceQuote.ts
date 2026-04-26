const CONTENT_LABELS = [
  "全书摘要",
  "全书概要",
  "内容摘要",
  "摘要",
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
  "阅读回响",
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
const CONTENT_LABEL_PATTERN = new RegExp(`(?:${CONTENT_LABELS.join("|")})(?:[:：]\\s*|\\s+)`, "gu");
const LEADING_METADATA_PATTERN = new RegExp(
  `^(?:${METADATA_LABELS.join("|")})[:：]\\s*[^:：\\n]+?(?=(?:\\s+(?:${ANY_LABEL_PATTERN})[:：])|$)`,
  "u"
);
const GENERIC_PREFIX_PATTERN =
  /^(这本书的核心是[:：]\s*|这本书的关键是[:：]\s*|核心是[:：]\s*|关键是[:：]\s*|一句话概括[:：]\s*|如果压缩成一句话[:：]\s*|可以概括为[:：]\s*)/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingBookTitle(text: string, title?: string): string {
  if (!title) return text;

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return text;

  const escapedTitle = escapeRegExp(trimmedTitle);
  const escapedWrappedTitle = escapeRegExp(`《${trimmedTitle}》`);
  const titlePattern = new RegExp(
    `^(?:${escapedWrappedTitle}|${escapedTitle})(?:\\s*(?:[-:：|/]|·|•)?\\s*)*`,
    "u"
  );

  return text.replace(titlePattern, "").trimStart();
}

function stripLeadingLabel(text: string): string {
  let normalized = text;

  for (let i = 0; i < 3; i += 1) {
    const match = normalized.match(
      /^([A-Za-z\u4e00-\u9fa5《》\s]{1,14})[:：]\s*([^\n]+)$/u
    );
    if (!match) break;

    const label = match[1].replace(/\s+/g, "").trim();
    const content = match[2].trim();

    if (!label || !content) break;
    if (/[，。！？、“”‘’；;（）()【】\[\]<>]/u.test(label)) break;
    if (content.length < 6) break;

    normalized = content;
  }

  return normalized.trim();
}

export function sanitizeWorkspaceQuote(text: string, options?: { title?: string }): string {
  let normalized = text
    .replace(/\*\*|__|`/g, " ")
    .replace(/^[\s>*#-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  normalized = stripLeadingBookTitle(normalized, options?.title);

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

  normalized = stripLeadingBookTitle(normalized, options?.title);
  normalized = stripLeadingLabel(normalized);

  return normalized;
}

export function hasWorkspaceQuoteArtifacts(text: string, options?: { title?: string }): boolean {
  const normalized = sanitizeWorkspaceQuote(text, options);
  if (!normalized) return true;
  if (normalized.length < 8) return true;

  const artifactPattern = /(?:书名|作者|作者名|全书摘要|全书概要|内容摘要|摘要|核心问题|核心观点|核心命题|核心结论|关键观点|关键问题|阅读回响)[:：]?/u;
  if (artifactPattern.test(normalized)) return true;

  if (options?.title) {
    const title = options.title.trim();
    if (title) {
      const titlePattern = new RegExp(`^(?:《?${escapeRegExp(title)}》?)\\s*`, "u");
      if (titlePattern.test(normalized)) return true;
    }
  }

  return false;
}
