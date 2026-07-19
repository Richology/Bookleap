const POSITION_LABELS = {
  opening: "开头样本",
  middle: "中段样本",
  ending: "结尾样本",
  full: "完整片段",
};
const FRONT_MATTER_TITLE_PATTERN =
  /^(cover|halftitle|titlepage|copyright|contents?|toc|index|preface|foreword|acknowledg(?:e)?ments?|contributors?|about|版权页|版权|目录|封面|扉页|书名页|出版信息|图书在版编目|前言|序言|译者序|致谢)$/i;
const PUBLICATION_METADATA_PATTERN =
  /图书在版编目|CIP\s*数据|ISBN|版权所有|Copyright|All rights reserved|中国版本图书馆|出版发行|出版社|印刷|版次|印次|定价/i;
const MARKDOWN_DECORATION_PATTERN = /[#>*_`~\-[\]()（）【】"'“”‘’]/g;
const CLAIM_STOP_WORDS = new Set([
  "这本书",
  "作者",
  "读者",
  "一个",
  "一种",
  "不是",
  "而是",
  "因为",
  "所以",
  "可以",
  "需要",
  "通过",
  "如果",
  "这个",
  "这些",
  "它的",
  "核心",
  "判断",
]);

function normalizeText(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function isLowValueEvidenceBrief(brief) {
  const title = normalizeText(brief?.chapterTitle);
  const preview = normalizeText(brief?.preview);

  if (FRONT_MATTER_TITLE_PATTERN.test(title)) return true;
  return PUBLICATION_METADATA_PATTERN.test(preview.slice(0, 700));
}

function clampText(value, limit) {
  const text = normalizeText(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function stripMarkdown(value) {
  return normalizeText(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ""))
    .replace(MARKDOWN_DECORATION_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractClaimTexts(content, limit = 4) {
  const lines = normalizeText(content)
    .split(/(?:\n+|(?<=。)|(?<=！)|(?<=？)|(?<=;)|(?<=；))/)
    .map(stripMarkdown)
    .map((line) => line.replace(/^\d+[.、]\s*/, "").trim())
    .filter((line) => line.length >= 18 && line.length <= 140)
    .filter((line) => !PUBLICATION_METADATA_PATTERN.test(line));
  const seen = new Set();
  const claims = [];

  for (const line of lines) {
    const claim = clampText(line, 120);
    if (seen.has(claim)) continue;
    seen.add(claim);
    claims.push(claim);
    if (claims.length >= limit) break;
  }

  return claims;
}

function getMatchTokens(value) {
  const text = stripMarkdown(value);
  const latinTokens = text.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) || [];
  const chineseTokens = text.match(/[\u4e00-\u9fff]{2,6}/g) || [];
  return [...new Set([...latinTokens, ...chineseTokens])]
    .filter((token) => token.length >= 2 && !CLAIM_STOP_WORDS.has(token))
    .slice(0, 40);
}

function scoreBriefForClaim(brief, claim) {
  const haystack = `${normalizeText(brief?.chapterTitle)} ${normalizeText(brief?.preview)} ${
    Array.isArray(brief?.quoteCandidates) ? brief.quoteCandidates.join(" ") : ""
  }`;
  const tokens = getMatchTokens(claim);
  if (tokens.length === 0) return 0;

  return tokens.reduce((score, token) => {
    if (!haystack.includes(token)) return score;
    return score + Math.min(4, token.length);
  }, 0);
}

function pickSourceIdsForClaim(briefs, claim, limit = 2) {
  return briefs
    .map((brief) => ({
      sourceId: normalizeText(brief?.sourceId),
      score: scoreBriefForClaim(brief, claim),
    }))
    .filter((item) => item.sourceId && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.sourceId);
}

function getBriefBySourceId(context, sourceId) {
  if (!context || !Array.isArray(context.evidenceBriefs)) return null;
  const brief = context.evidenceBriefs.find((item) => item.sourceId === sourceId) ?? null;
  if (!brief || isLowValueEvidenceBrief(brief)) return null;
  return brief;
}

function pickQuote(brief, requestedQuote = "") {
  const quote = normalizeText(requestedQuote);
  const candidates = Array.isArray(brief.quoteCandidates) ? brief.quoteCandidates : [];

  if (quote && candidates.includes(quote)) {
    return { quote, supportLevel: "direct" };
  }

  const candidate = candidates.find((item) => normalizeText(item).length >= 18) || candidates[0];
  if (candidate) {
    return { quote: normalizeText(candidate), supportLevel: "direct" };
  }

  return {
    quote: clampText(brief.preview, 260),
    supportLevel: "inferred",
  };
}

function buildExcerpt(brief, requestedQuote = "") {
  const picked = pickQuote(brief, requestedQuote);
  const preview = normalizeText(brief.preview);
  const showContext = preview && preview !== picked.quote;
  const quoteIndex = showContext ? preview.indexOf(picked.quote) : -1;
  const before =
    quoteIndex >= 0
      ? preview.slice(Math.max(0, quoteIndex - 120), quoteIndex)
      : preview.slice(0, 120);
  const after =
    quoteIndex >= 0
      ? preview.slice(quoteIndex + picked.quote.length, quoteIndex + picked.quote.length + 140)
      : preview.slice(120, 260);

  return {
    sourceId: brief.sourceId,
    chapterIndex: brief.chapterIndex,
    chapterTitle: brief.chapterTitle,
    samplePosition: brief.position,
    quote: picked.quote,
    before: showContext ? clampText(before, 120) : undefined,
    after: showContext ? clampText(after, 140) : undefined,
    supportLevel: picked.supportLevel,
  };
}

function createClaimFromBrief({ cardKey, cardLabel, brief, index }) {
  const excerpt = buildExcerpt(brief);
  const sourceLabel = `${brief.sourceId} · 第 ${brief.chapterIndex} 部分 · ${POSITION_LABELS[brief.position]}`;

  return {
    id: `${cardKey}-${brief.sourceId}-${index}`,
    claim: index === 0 ? `${cardLabel}的核心判断` : `补充依据 ${index + 1}`,
    sourceIds: [brief.sourceId],
    supportLevel: excerpt.supportLevel,
    explanation: `这条依据来自 ${sourceLabel}，用于支撑「${cardLabel}」中的判断。`,
    excerpts: [excerpt],
  };
}

function normalizeClaim({ cardKey, cardLabel, claim, context, index }) {
  const sourceIds = Array.isArray(claim?.sourceIds)
    ? claim.sourceIds.map(normalizeText).filter(Boolean)
    : [];
  const excerpts = [];

  for (const sourceId of sourceIds) {
    const brief = getBriefBySourceId(context, sourceId);
    if (!brief) continue;
    const requestedQuote = Array.isArray(claim.excerpts)
      ? claim.excerpts.find((excerpt) => excerpt?.sourceId === sourceId)?.quote
      : "";
    excerpts.push(buildExcerpt(brief, requestedQuote));
  }

  if (excerpts.length === 0) return null;

  const supportLevel = excerpts.some((excerpt) => excerpt.supportLevel === "direct")
    ? "direct"
    : "inferred";

  return {
    id: normalizeText(claim?.id) || `${cardKey}-claim-${index + 1}`,
    claim: clampText(claim?.claim, 120) || `${cardLabel}的依据 ${index + 1}`,
    sourceIds: excerpts.map((excerpt) => excerpt.sourceId),
    supportLevel,
    explanation: clampText(claim?.explanation, 180) || `这些原文片段支撑「${cardLabel}」中的判断。`,
    excerpts: excerpts.map(({ supportLevel: _supportLevel, ...excerpt }) => excerpt),
  };
}

/**
 * @param {{
 *   cardKey: string;
 *   cardLabel: string;
 *   context?: { evidenceBriefs?: Array<any> };
 *   claims?: Array<any>;
 *   maxClaims?: number;
 *   allowFallback?: boolean;
 * }} input
 */
export function buildCardEvidence(input) {
  const cardKey = normalizeText(input?.cardKey);
  const cardLabel = normalizeText(input?.cardLabel) || "卡片";
  const context = input?.context;
  const maxClaims = input?.maxClaims ?? 4;
  const allowFallback = input?.allowFallback ?? true;
  const briefs = Array.isArray(context?.evidenceBriefs)
    ? context.evidenceBriefs.filter((brief) => !isLowValueEvidenceBrief(brief))
    : [];

  if (!cardKey || briefs.length === 0) {
    return null;
  }

  const normalizedClaims = Array.isArray(input.claims)
    ? input.claims
        .map((claim, index) => normalizeClaim({ cardKey, cardLabel, claim, context, index }))
        .filter(Boolean)
        .slice(0, maxClaims)
    : [];

  const claims = normalizedClaims.length > 0
    ? normalizedClaims
    : allowFallback
      ? briefs.slice(0, maxClaims).map((brief, index) =>
        createClaimFromBrief({ cardKey, cardLabel, brief, index })
      )
      : [];

  if (claims.length === 0) return null;

  return {
    cardKey,
    cardLabel,
    claims,
  };
}

/**
 * @param {{
 *   cardKey: string;
 *   cardLabel: string;
 *   content?: string;
 *   context?: { evidenceBriefs?: Array<any> };
 *   maxClaims?: number;
 * }} input
 */
export function buildCardEvidenceFromContent(input) {
  const context = input?.context;
  const briefs = Array.isArray(context?.evidenceBriefs)
    ? context.evidenceBriefs.filter((brief) => !isLowValueEvidenceBrief(brief))
    : [];
  const claims = extractClaimTexts(input?.content, input?.maxClaims ?? 4)
    .map((claim, index) => {
      const sourceIds = pickSourceIdsForClaim(briefs, claim);
      return sourceIds.length > 0
        ? {
            id: `${normalizeText(input?.cardKey) || "card"}-claim-${index + 1}`,
            claim,
            sourceIds,
            explanation: `这条依据用于支撑「${claim}」。`,
          }
        : null;
    })
    .filter(Boolean);

  if (claims.length === 0) return null;

  return buildCardEvidence({
    cardKey: input?.cardKey,
    cardLabel: input?.cardLabel,
    context,
    claims,
    maxClaims: input?.maxClaims,
    allowFallback: false,
  });
}
