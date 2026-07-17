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
  return markdown.replace(/^##\s*关键思想谱系\s*$/gm, "## 核心思想来源");
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

export function cleanupIdeaSourceTracingMarkdown(markdown) {
  return normalizeIdeaSourceHeadings(stripInlineBoldMarkers(markdown));
}
