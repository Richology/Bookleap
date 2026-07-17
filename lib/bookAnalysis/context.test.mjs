import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookContext,
  buildStoredBookContext,
  extractQuoteCandidates,
  formatBookContextForPrompt,
  selectRepresentativeChapters,
  toAnalysisChapters,
} from "./context.mjs";

function makeChapter(index, text = "") {
  const body = text || `第${index}章内容。`.repeat(260);
  return {
    id: `chapter-${index}`,
    title: `第 ${index} 章`,
    text: body,
  };
}

test("selects representative chapters across beginning middle and ending", () => {
  const chapters = Array.from({ length: 20 }, (_, index) => makeChapter(index + 1));

  const selected = selectRepresentativeChapters(chapters, {
    targetChapterCount: 5,
    sampleCharLimit: 120,
    totalCharLimit: 3000,
  });

  const chapterIndexes = new Set(
    selected.map((chapter) => chapter.analysisMeta.chapterIndex)
  );

  assert.equal(chapterIndexes.has(1), true);
  assert.equal(chapterIndexes.has(20), true);
  assert.equal(
    [...chapterIndexes].some((index) => index >= 9 && index <= 12),
    true
  );
});

test("long chapters produce opening middle and ending samples", () => {
  const longText = [
    "开头观点。".repeat(120),
    "中段论证。".repeat(120),
    "结尾总结。".repeat(120),
  ].join("\n\n");

  const selected = selectRepresentativeChapters([makeChapter(1, longText)], {
    sampleCharLimit: 80,
    totalCharLimit: 1000,
  });

  assert.deepEqual(
    selected.map((chapter) => chapter.analysisMeta.samplePosition),
    ["opening", "middle", "ending"]
  );
  assert.match(selected[0].text, /开头观点/);
  assert.match(selected[1].text, /中段论证/);
  assert.match(selected[2].text, /结尾总结/);
});

test("quote candidates are exact substrings from source text", () => {
  const source =
    "目录\n真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。普通说明文字。https://example.com";

  const candidates = extractQuoteCandidates([source], {
    minLength: 20,
    maxLength: 60,
  });

  assert.deepEqual(candidates, [
    "真正重要的能力，是在复杂环境里保持判断，而不是记住更多结论。",
  ]);
  assert.equal(source.includes(candidates[0]), true);
});

test("formatted context excludes placeholder summaries", () => {
  const context = buildBookContext({
    title: "测试书",
    author: "作者",
    chapters: [
      {
        ...makeChapter(1),
        summary: "为保证速度，当前版本暂未生成这一章的摘要。",
      },
      {
        ...makeChapter(2),
        summary: "这一章解释了核心概念和主要论证。",
      },
    ],
  });

  const formatted = formatBookContextForPrompt(context);

  assert.match(formatted, /覆盖范围/);
  assert.match(formatted, /这一章解释了核心概念和主要论证/);
  assert.doesNotMatch(formatted, /暂未生成/);
});

test("analysis chapters keep frontend-compatible fields with metadata", () => {
  const chapters = Array.from({ length: 4 }, (_, index) => makeChapter(index + 1));
  const analysisChapters = toAnalysisChapters(chapters, {
    targetChapterCount: 3,
    sampleCharLimit: 100,
    totalCharLimit: 1200,
  });

  assert.equal(typeof analysisChapters[0].id, "string");
  assert.equal(typeof analysisChapters[0].title, "string");
  assert.equal(typeof analysisChapters[0].text, "string");
  assert.equal(typeof analysisChapters[0].analysisMeta.chapterIndex, "number");
  assert.equal(
    Array.isArray(analysisChapters[0].analysisMeta.quoteCandidates),
    true
  );
});

test("stored book context keeps traceability without storing full sample text", () => {
  const longText = "这是一段用于追溯的原文。".repeat(400);
  const analysisChapters = toAnalysisChapters([makeChapter(1, longText)], {
    sampleCharLimit: 1200,
    totalCharLimit: 3600,
  });

  const stored = buildStoredBookContext({
    title: "测试书",
    author: "作者",
    chapters: analysisChapters,
  });
  const serialized = JSON.stringify(stored);

  assert.equal(stored.samples.length, analysisChapters.length);
  assert.equal(stored.samples[0].preview.length <= 260, true);
  assert.equal(serialized.includes(longText), false);
  assert.equal(serialized.length < 12000, true);
});
