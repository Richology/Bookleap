export function stripInlineBoldMarkers(markdown) {
  return markdown.replace(/\*\*([^*\n]+)\*\*/g, "$1");
}

export function normalizeActionHeadings(markdown) {
  return markdown.replace(
    /^(?:#{2,4}\s*)?行动\s*([0-9一二三四五六七八九十]+)\s*[：:\s]+(.+)$/gm,
    (_match, index, title) => `### 行动${index}：${title.trim()}`
  );
}

export function normalizeBoundarySection(markdown) {
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
    .replace(/\*\*/g, "")
    .replace(/(?:^|\n)\s*(?:[-*+]\s*)?不\s*\n+\s*适用场景[：:：]?\s*/g, "\n\n### 不适用场景\n")
    .replace(/(?:^|\n)\s*(?:[-*+]\s*)?不适用场景[：:：]?\s*/g, "\n\n### 不适用场景\n")
    .replace(/(?:^|\n)\s*(?:[-*+]\s*)?适用场景[：:：]?\s*/g, "\n\n### 适用场景\n")
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return `${before}\n${normalizedSection}${after}`.replace(/\n{3,}/g, "\n\n");
}

export function normalizeIdeaSourceHeadings(markdown) {
  return markdown
    .replace(/^##\s*关键思想谱系\s*$/gm, "## 核心思想来源")
    .replace(/^##\s*可能来源\s*$/gm, "## 思想来源拆解");
}

function normalizeQuoteLine(value) {
  return value
    .replace(/^\s*(?:[-*+]\s*|\d+\s*[.)、．]\s*)/, "")
    .replace(/^[「『"']|[」』"']$/g, "")
    .trim();
}

export function extractQuoteCandidatesFromAnalysisContext(analysisContext) {
  const marker = "## 原文金句候选";
  const start = analysisContext.indexOf(marker);

  if (start === -1) return [];

  const sectionStart = start + marker.length;
  const nextSectionStart = analysisContext.indexOf("\n## ", sectionStart);
  const section = nextSectionStart === -1
    ? analysisContext.slice(sectionStart)
    : analysisContext.slice(sectionStart, nextSectionStart);
  const seen = new Set();
  const candidates = [];

  section.split("\n").forEach((line) => {
    const quote = normalizeQuoteLine(line);
    if (!quote || seen.has(quote)) return;

    seen.add(quote);
    candidates.push(quote);
  });

  return candidates;
}

export function enforceIdeaSourceQuoteCandidates(markdown, quoteCandidates) {
  const marker = "## 原文金句";
  const start = markdown.indexOf(marker);

  if (start === -1) return markdown;

  const sectionStart = start + marker.length;
  const nextSectionStart = markdown.indexOf("\n## ", sectionStart);
  const before = markdown.slice(0, sectionStart);
  const section = nextSectionStart === -1
    ? markdown.slice(sectionStart)
    : markdown.slice(sectionStart, nextSectionStart);
  const after = nextSectionStart === -1 ? "" : markdown.slice(nextSectionStart);
  const allowed = new Set(quoteCandidates);
  const selected = [];
  const seen = new Set();

  section.split("\n").forEach((line) => {
    const quote = normalizeQuoteLine(line);
    if (!quote || !allowed.has(quote) || seen.has(quote)) return;

    seen.add(quote);
    selected.push(quote);
  });

  const normalizedSection = selected.length
    ? selected.slice(0, 5).map((quote, index) => `${index + 1}. ${quote}`).join("\n")
    : "当前模型输出中没有逐字匹配的原文金句候选。";

  const normalizedAfter = after ? `\n\n${after.trimStart()}` : "";

  return `${before}\n${normalizedSection}${normalizedAfter}`.replace(/\n{3,}/g, "\n\n");
}

export function cleanupReadingGuideMarkdown(markdown) {
  return stripInlineBoldMarkers(markdown);
}

export function cleanupActionExtractionMarkdown(markdown) {
  return normalizeActionHeadings(stripInlineBoldMarkers(markdown));
}

export function cleanupCriticalExaminationMarkdown(markdown) {
  return normalizeBoundarySection(stripInlineBoldMarkers(markdown));
}

export function cleanupIdeaSourceTracingMarkdown(markdown, quoteCandidates = []) {
  const cleaned = normalizeIdeaSourceHeadings(stripInlineBoldMarkers(markdown));

  return enforceIdeaSourceQuoteCandidates(cleaned, quoteCandidates);
}
