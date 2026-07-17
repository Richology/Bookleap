import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanupIdeaSourceTracingMarkdown,
  enforceIdeaSourceQuoteCandidates,
  extractQuoteCandidatesFromAnalysisContext,
  normalizeActionHeadings,
  normalizeBoundarySection,
  normalizeIdeaSourceHeadings,
  stripInlineBoldMarkers,
} from "./markdownCleanup.mjs";

test("strips inline bold markers that can leak into rendered paragraphs", () => {
  const markdown = '建议重点读第3章与**"轻规则"**相关章节。';

  assert.equal(
    stripInlineBoldMarkers(markdown),
    '建议重点读第3章与"轻规则"相关章节。'
  );
});

test("normalizes action headings with missing colon", () => {
  const markdown = `## 可执行行动

行动1 在公开表达中植入“弱者视角”
开场先承认自己的不足。

### 行动2 把核心信息装进“轻载体”
准备一段严肃观点。`;

  assert.equal(
    normalizeActionHeadings(markdown),
    `## 可执行行动

### 行动1：在公开表达中植入“弱者视角”
开场先承认自己的不足。

### 行动2：把核心信息装进“轻载体”
准备一段严肃观点。`
  );
});

test("normalizes applicable and non-applicable boundary headings to same level", () => {
  const markdown = `## 适用边界

**适用场景：**
1. 社交媒体传播。

**不适用场景：**
1. 专业判断领域。`;

  assert.equal(
    normalizeBoundarySection(markdown),
    `## 适用边界

### 适用场景
- 社交媒体传播。

### 不适用场景
- 专业判断领域。`
  );
});

test("renames unclear idea source heading", () => {
  const markdown = `## 关键思想谱系
1. 注意力经济。

## 可能来源
1. 传播学传统。`;

  assert.equal(
    normalizeIdeaSourceHeadings(markdown),
    `## 核心思想来源
1. 注意力经济。

## 思想来源拆解
1. 传播学传统。`
  );
});

test("extracts quote candidates from formatted analysis context", () => {
  const analysisContext = `## 抽样章节摘要
- 摘要

## 原文金句候选
1. 真正重要的能力，是在复杂环境里保持判断。
2. 好的问题，会迫使答案自己变得诚实。

## 其他`;

  assert.deepEqual(extractQuoteCandidatesFromAnalysisContext(analysisContext), [
    "真正重要的能力，是在复杂环境里保持判断。",
    "好的问题，会迫使答案自己变得诚实。",
  ]);
});

test("keeps only exact idea source quotes from candidates", () => {
  const markdown = `## 原文金句
1. 真正重要的能力，是在复杂环境里保持判断。
2. 这是一句模型编造的金句。
3. 「好的问题，会迫使答案自己变得诚实。」

## 总结
这本书的价值在于帮助读者重新组织判断。`;
  const candidates = [
    "真正重要的能力，是在复杂环境里保持判断。",
    "好的问题，会迫使答案自己变得诚实。",
  ];

  assert.equal(
    enforceIdeaSourceQuoteCandidates(markdown, candidates),
    `## 原文金句
1. 真正重要的能力，是在复杂环境里保持判断。
2. 好的问题，会迫使答案自己变得诚实。

## 总结
这本书的价值在于帮助读者重新组织判断。`
  );
});

test("does not invent idea source quotes when none match candidates", () => {
  const markdown = `## 原文金句
1. 这是一句模型编造的金句。

## 总结
暂时无法确认。`;

  assert.equal(
    cleanupIdeaSourceTracingMarkdown(markdown, ["真正重要的能力，是在复杂环境里保持判断。"]),
    `## 原文金句
当前模型输出中没有逐字匹配的原文金句候选。

## 总结
暂时无法确认。`
  );
});
