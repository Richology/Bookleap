const POSITION_LABELS = {
  opening: "开头样本",
  middle: "中段样本",
  ending: "结尾样本",
  full: "完整片段",
};

function normalizeText(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function clampText(value, limit) {
  const text = normalizeText(value);
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function getBriefBySourceId(context, sourceId) {
  if (!context || !Array.isArray(context.evidenceBriefs)) return null;
  return context.evidenceBriefs.find((brief) => brief.sourceId === sourceId) ?? null;
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
 * }} input
 */
export function buildCardEvidence(input) {
  const cardKey = normalizeText(input?.cardKey);
  const cardLabel = normalizeText(input?.cardLabel) || "卡片";
  const context = input?.context;
  const maxClaims = input?.maxClaims ?? 4;
  const briefs = Array.isArray(context?.evidenceBriefs) ? context.evidenceBriefs : [];

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
    : briefs.slice(0, maxClaims).map((brief, index) =>
        createClaimFromBrief({ cardKey, cardLabel, brief, index })
      );

  return {
    cardKey,
    cardLabel,
    claims,
  };
}
