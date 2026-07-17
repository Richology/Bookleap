const DEFAULT_TARGET_CHAPTER_COUNT = 16;
const DEFAULT_SAMPLE_CHAR_LIMIT = 1600;
const DEFAULT_TOTAL_CHAR_LIMIT = 90000;
const DEFAULT_QUOTE_MIN_LENGTH = 30;
const DEFAULT_QUOTE_MAX_LENGTH = 100;
const PLACEHOLDER_SUMMARY_PATTERN = /暂未生成|not generated/i;

const POSITION_LABELS = {
  opening: "开头",
  middle: "中段",
  ending: "结尾",
  full: "全文",
};

function normalizeText(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    : "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function pickRepresentativeIndexes(total, target) {
  if (total <= 0) return [];
  if (total <= target) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const indexes = [];
  const last = total - 1;
  const steps = Math.max(1, target - 1);

  for (let i = 0; i < target; i += 1) {
    indexes.push(Math.round((last * i) / steps));
  }

  return uniqueSorted(indexes);
}

function sliceAround(text, center, limit) {
  if (text.length <= limit) return text;
  const half = Math.floor(limit / 2);
  const start = clamp(center - half, 0, Math.max(0, text.length - limit));
  return text.slice(start, start + limit).trim();
}

function createSamplesForChapter(text, limit) {
  const cleanText = normalizeText(text);
  if (!cleanText) return [];

  if (cleanText.length <= Math.floor(limit * 1.25)) {
    return [{ position: "full", text: cleanText }];
  }

  return [
    { position: "opening", text: cleanText.slice(0, limit).trim() },
    { position: "middle", text: sliceAround(cleanText, Math.floor(cleanText.length / 2), limit) },
    { position: "ending", text: cleanText.slice(Math.max(0, cleanText.length - limit)).trim() },
  ].filter((sample) => sample.text.length > 0);
}

function getChapterTitle(chapter, fallbackIndex) {
  const title = typeof chapter?.title === "string" ? chapter.title.trim() : "";
  return title || `第 ${fallbackIndex} 部分`;
}

/**
 * @param {string[]} texts
 * @param {{ minLength?: number; maxLength?: number; limit?: number }} [options]
 * @returns {string[]}
 */
export function extractQuoteCandidates(texts, options = {}) {
  const minLength = options.minLength ?? DEFAULT_QUOTE_MIN_LENGTH;
  const maxLength = options.maxLength ?? DEFAULT_QUOTE_MAX_LENGTH;
  const seen = new Set();
  const candidates = [];

  for (const value of texts) {
    const text = normalizeText(value);
    if (!text) continue;

    const sentences = text.match(/[^。！？!?；;\n]{6,}[。！？!?；;]/g) || [];
    for (const rawSentence of sentences) {
      const sentence = rawSentence.replace(/\s+/g, " ").trim();
      if (sentence.length < minLength || sentence.length > maxLength) continue;
      if (/https?:\/\/|www\.|版权|目录|ISBN|Copyright|All rights reserved/i.test(sentence)) {
        continue;
      }
      if (seen.has(sentence)) continue;

      seen.add(sentence);
      candidates.push(sentence);
    }
  }

  return candidates.slice(0, options.limit ?? 40);
}

/**
 * @param {Array<{ id?: string; title?: string; text?: string; summary?: string }>} chapters
 * @param {{ targetChapterCount?: number; sampleCharLimit?: number; totalCharLimit?: number }} [options]
 * @returns {Array<{
 *   id: string;
 *   title: string;
 *   text: string;
 *   summary?: string;
 *   analysisMeta: {
 *     chapterIndex: number;
 *     originalChapterId: string;
 *     originalTitle: string;
 *     totalChapters: number;
 *     estimatedChars: number;
 *     positionRatio: number;
 *     sampleIndex: number;
 *     samplePosition: "opening" | "middle" | "ending" | "full";
 *     quoteCandidates: string[];
 *   };
 * }>}
 */
export function selectRepresentativeChapters(chapters, options = {}) {
  const sourceChapters = Array.isArray(chapters)
    ? chapters
        .map((chapter, index) => ({
          ...chapter,
          id: typeof chapter?.id === "string" && chapter.id ? chapter.id : `chapter-${index + 1}`,
          title: getChapterTitle(chapter, index + 1),
          text: normalizeText(chapter?.text),
          sourceIndex: index,
        }))
        .filter((chapter) => chapter.text.length > 0)
    : [];

  const targetChapterCount = options.targetChapterCount ?? DEFAULT_TARGET_CHAPTER_COUNT;
  const sampleCharLimit = options.sampleCharLimit ?? DEFAULT_SAMPLE_CHAR_LIMIT;
  const totalCharLimit = options.totalCharLimit ?? DEFAULT_TOTAL_CHAR_LIMIT;
  const selectedIndexes = pickRepresentativeIndexes(sourceChapters.length, targetChapterCount);
  const selected = [];
  let usedChars = 0;

  for (const sourceIndex of selectedIndexes) {
    const chapter = sourceChapters[sourceIndex];
    if (!chapter) continue;

    const samples = createSamplesForChapter(chapter.text, sampleCharLimit);
    for (const [sampleIndex, sample] of samples.entries()) {
      if (usedChars >= totalCharLimit) break;

      const remaining = totalCharLimit - usedChars;
      const sampleText = sample.text.slice(0, remaining).trim();
      if (!sampleText) continue;

      const chapterIndex = chapter.sourceIndex + 1;
      const samplePosition = sample.position;
      const sampleTitle =
        samplePosition === "full"
          ? chapter.title
          : `${chapter.title}（${POSITION_LABELS[samplePosition]}）`;
      const quoteCandidates = extractQuoteCandidates([sampleText]);

      selected.push({
        id: `${chapter.id}:${samplePosition}`,
        title: sampleTitle,
        text: sampleText,
        summary: chapter.summary,
        analysisMeta: {
          chapterIndex,
          originalChapterId: chapter.id,
          originalTitle: chapter.title,
          totalChapters: sourceChapters.length,
          estimatedChars: chapter.text.length,
          positionRatio:
            sourceChapters.length <= 1 ? 0 : chapter.sourceIndex / (sourceChapters.length - 1),
          sampleIndex: sampleIndex + 1,
          samplePosition,
          quoteCandidates,
        },
      });

      usedChars += sampleText.length;
    }
  }

  return selected;
}

/**
 * @param {Array<{ id?: string; title?: string; text?: string; summary?: string }>} chapters
 * @param {{ targetChapterCount?: number; sampleCharLimit?: number; totalCharLimit?: number }} [options]
 */
export function toAnalysisChapters(chapters, options = {}) {
  return selectRepresentativeChapters(chapters, options);
}

function buildOutline(chapters) {
  const byOriginalChapter = new Map();

  chapters.forEach((chapter, index) => {
    const meta = chapter.analysisMeta || {};
    const chapterIndex = meta.chapterIndex ?? index + 1;
    const title = meta.originalTitle || getChapterTitle(chapter, chapterIndex);

    if (!byOriginalChapter.has(chapterIndex)) {
      byOriginalChapter.set(chapterIndex, {
        index: chapterIndex,
        id: meta.originalChapterId || chapter.id || `chapter-${chapterIndex}`,
        title,
        estimatedChars: meta.estimatedChars ?? normalizeText(chapter.text).length,
        positionRatio: meta.positionRatio ?? 0,
      });
    }
  });

  return [...byOriginalChapter.values()].sort((a, b) => a.index - b.index);
}

function buildBriefs(chapters) {
  return chapters
    .map((chapter, index) => {
      const meta = chapter.analysisMeta || {};
      const summary = normalizeText(chapter.summary);
      const text = normalizeText(chapter.text);
      const fallbackSummary = text.replace(/\s+/g, " ").slice(0, 180);
      const cleanSummary =
        summary && !PLACEHOLDER_SUMMARY_PATTERN.test(summary) ? summary : fallbackSummary;

      return {
        chapterIndex: meta.chapterIndex ?? index + 1,
        title: meta.originalTitle || getChapterTitle(chapter, index + 1),
        summary: cleanSummary,
        keyPoints: [],
        evidenceHints: text ? [text.replace(/\s+/g, " ").slice(0, 120)] : [],
      };
    })
    .filter((brief) => brief.summary && !PLACEHOLDER_SUMMARY_PATTERN.test(brief.summary));
}

/**
 * @param {{
 *   title?: string;
 *   author?: string;
 *   chapters?: Array<{
 *     id?: string;
 *     title?: string;
 *     text?: string;
 *     summary?: string;
 *     analysisMeta?: {
 *       chapterIndex?: number;
 *       originalChapterId?: string;
 *       originalTitle?: string;
 *       totalChapters?: number;
 *       estimatedChars?: number;
 *       positionRatio?: number;
 *       samplePosition?: "opening" | "middle" | "ending" | "full";
 *       quoteCandidates?: string[];
 *     };
 *   }>;
 * }} [input]
 */
export function buildBookContext({ title = "", author = "", chapters = [] } = {}) {
  const analysisChapters = Array.isArray(chapters) ? chapters : [];
  const outline = buildOutline(analysisChapters);
  const samples = analysisChapters.map((chapter, index) => {
    const meta = chapter.analysisMeta || {};
    return {
      chapterIndex: meta.chapterIndex ?? index + 1,
      chapterTitle: meta.originalTitle || getChapterTitle(chapter, index + 1),
      position: meta.samplePosition || "full",
      text: normalizeText(chapter.text),
    };
  });
  const quoteCandidates = [
    ...new Set([
      ...analysisChapters.flatMap((chapter) =>
        Array.isArray(chapter.analysisMeta?.quoteCandidates)
          ? chapter.analysisMeta.quoteCandidates
          : []
      ),
      ...extractQuoteCandidates(analysisChapters.map((chapter) => chapter.text)),
    ]),
  ].slice(0, 50);
  const totalChapters =
    analysisChapters[0]?.analysisMeta?.totalChapters ?? outline.length ?? analysisChapters.length;

  return {
    title,
    author,
    coverage: {
      totalChapters,
      sampledChapters: outline.length,
      totalSamples: samples.length,
      strategy: "全书结构 + 代表性抽样",
    },
    outline,
    samples,
    chapterBriefs: buildBriefs(analysisChapters),
    quoteCandidates,
  };
}

/**
 * @param {ReturnType<typeof buildBookContext>} context
 * @param {{ maxBriefs?: number; maxQuotes?: number }} [options]
 * @returns {string}
 */
export function formatBookContextForPrompt(context, options = {}) {
  const maxBriefs = options.maxBriefs ?? 24;
  const maxQuotes = options.maxQuotes ?? 20;
  const lines = [
    `书名：${context.title || "未知书名"}`,
    context.author ? `作者：${context.author}` : "",
    "",
    "## 覆盖范围",
    `- 总章节/文本块数：${context.coverage.totalChapters}`,
    `- 抽样章节/文本块数：${context.coverage.sampledChapters}`,
    `- 样本片段数：${context.coverage.totalSamples}`,
    `- 策略：${context.coverage.strategy}`,
    "",
    "## 全书目录摘要",
    ...context.outline.map(
      (item) =>
        `- ${item.index}. ${item.title}（约 ${item.estimatedChars} 字，位置 ${Math.round(
          item.positionRatio * 100
        )}%）`
    ),
    "",
    "## 抽样章节摘要",
    ...context.chapterBriefs.slice(0, maxBriefs).map((brief) => {
      const evidence = brief.evidenceHints.length
        ? `\n  依据提示：${brief.evidenceHints.join(" / ")}`
        : "";
      return `- 第 ${brief.chapterIndex} 部分：${brief.title}\n  摘要：${brief.summary}${evidence}`;
    }),
  ].filter(Boolean);

  if (context.quoteCandidates.length > 0) {
    lines.push(
      "",
      "## 原文金句候选",
      ...context.quoteCandidates
        .slice(0, maxQuotes)
        .map((quote, index) => `${index + 1}. ${quote}`)
    );
  }

  return lines.join("\n");
}

/**
 * @param {{
 *   title?: string;
 *   author?: string;
 *   chapters?: Array<{
 *     id?: string;
 *     title?: string;
 *     text?: string;
 *     summary?: string;
 *     analysisMeta?: {
 *       chapterIndex?: number;
 *       originalChapterId?: string;
 *       originalTitle?: string;
 *       totalChapters?: number;
 *       estimatedChars?: number;
 *       positionRatio?: number;
 *       samplePosition?: "opening" | "middle" | "ending" | "full";
 *       quoteCandidates?: string[];
 *     };
 *   }>;
 * }} input
 * @returns {{
 *   version: 1;
 *   title: string;
 *   author: string;
 *   coverage: ReturnType<typeof buildBookContext>["coverage"];
 *   outline: ReturnType<typeof buildBookContext>["outline"];
 *   samples: Array<{
 *     chapterIndex: number;
 *     chapterTitle: string;
 *     position: "opening" | "middle" | "ending" | "full";
 *     preview: string;
 *   }>;
 *   quoteCandidates: string[];
 * }}
 */
export function buildStoredBookContext(input) {
  const context = buildBookContext(input);

  return {
    version: 1,
    title: context.title,
    author: context.author,
    coverage: context.coverage,
    outline: context.outline,
    samples: context.samples.map((sample) => ({
      chapterIndex: sample.chapterIndex,
      chapterTitle: sample.chapterTitle,
      position: sample.position,
      preview: sample.text.replace(/\s+/g, " ").slice(0, 260),
    })),
    quoteCandidates: context.quoteCandidates.slice(0, 12),
  };
}
