import test from "node:test";
import assert from "node:assert/strict";
import {
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
1. 注意力经济。`;

  assert.equal(
    normalizeIdeaSourceHeadings(markdown),
    `## 核心思想来源
1. 注意力经济。`
  );
});
