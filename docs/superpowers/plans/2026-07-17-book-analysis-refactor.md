# 拆书分析重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级后端拆书取样、上下文构建和 6 张卡片 prompt，让分析覆盖更广、信息更密、重复更少，并保持前端 API 兼容。

**Architecture:** 新增 `lib/bookAnalysis` 作为纯函数层，负责代表性抽样、上下文归一化、金句候选提取和 prompt 上下文拼接。`/api/analyze` 继续返回现有 `chapters` 字段，但内容改为代表性样本单元；skill routes 和 generators 统一通过 `BookContext` 生成 prompt。前端组件不改。

**Tech Stack:** Next.js API routes, TypeScript, Node built-in `node:test`, existing Ollama generator, existing prompt files.

## Global Constraints

- 不新增完整 EPUB 阅读器。
- 不新增前端页面、面板、按钮或控件。
- 不要求把整本书每一个字都传给模型。
- 现有前端兼容字段 `title`、`author`、`coverImage`、`bookSummary`、`chapters`、`mode` 保持可用。
- 金句必须来自解析原文候选句，不能由模型改写或编造。
- 思想溯源保持默认卡，证据弱时提示依据不足，不改成可选卡。

---

## File Structure

- Create: `lib/bookAnalysis/context.mjs`
  - Pure JavaScript utilities for representative sampling, quote candidates, `BookContext`, and context formatting.
- Create: `lib/bookAnalysis/context.d.ts`
  - Type declarations for TS consumers.
- Test: `lib/bookAnalysis/context.test.mjs`
  - Node test coverage for sampling, quote extraction, placeholder filtering, and context formatting.
- Modify: `app/api/analyze/route.ts`
  - Parse more source units, use representative sampling, return sampled chapter units through `chapters`.
- Modify: `app/api/skills/*/route.ts`
  - Normalize incoming chapters into context before calling skill generators.
- Modify: `lib/skills/generate*.ts`
  - Accept normalized context strings or richer items consistently.
- Modify: `lib/prompts/*.ts`
  - Rewrite six card prompts according to the approved Chinese spec.

---

### Task 1: Book Analysis Context Utilities

**Files:**
- Create: `lib/bookAnalysis/context.test.mjs`
- Create: `lib/bookAnalysis/context.mjs`
- Create: `lib/bookAnalysis/context.d.ts`

**Interfaces:**
- Produces: `selectRepresentativeChapters(chapters, options?)`
- Produces: `extractQuoteCandidates(texts, options?)`
- Produces: `buildBookContext({ title, author, chapters })`
- Produces: `formatBookContextForPrompt(context, options?)`

- [ ] **Step 1: Write failing tests**

Create tests that assert:

- a 20-chapter input samples beginning, middle, and ending positions;
- long chapters produce opening, middle, ending samples;
- quote candidates are exact source substrings;
- placeholder summaries are excluded from prompt context.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: FAIL because `context.mjs` does not exist yet.

- [ ] **Step 3: Implement minimal utilities**

Create focused pure functions in `context.mjs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: PASS.

---

### Task 2: Analyze Route Sampling Upgrade

**Files:**
- Modify: `app/api/analyze/route.ts`
- Test: `lib/bookAnalysis/context.test.mjs`

**Interfaces:**
- Consumes: `selectRepresentativeChapters`
- Produces: existing API `chapters: ChapterItem[]`, where items may include optional metadata ignored by frontend.

- [ ] **Step 1: Add tests for API-shaped sampled chapters**

Extend context tests to check sampled chapter units retain `id`, `title`, `text`, and include optional metadata.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: FAIL until API-shape helper exists.

- [ ] **Step 3: Update parser output**

Update EPUB/AZW3/TXT/PDF parsing to gather more source units, then sample with shared utilities before returning.

- [ ] **Step 4: Run tests**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: PASS.

---

### Task 3: Shared Context In Skill Routes

**Files:**
- Modify: `app/api/skills/book-summary/route.ts`
- Modify: `app/api/skills/reading-guide/route.ts`
- Modify: `app/api/skills/view-map/route.ts`
- Modify: `app/api/skills/action-extraction/route.ts`
- Modify: `app/api/skills/view-validation/route.ts`
- Modify: `app/api/skills/original-reading-value/route.ts`

**Interfaces:**
- Consumes: `buildBookContext`
- Produces: consistent context strings for prompt generators.

- [ ] **Step 1: Add context formatting tests**

Test that route-compatible chapter input formats into a context string containing coverage, outline, sampled briefs, and no placeholder text.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: FAIL until formatter includes the required fields.

- [ ] **Step 3: Update skill routes and generators**

Route handlers normalize chapters once and pass the formatted context to prompt generators.

- [ ] **Step 4: Run tests**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: PASS.

---

### Task 4: Six Prompt Refactor

**Files:**
- Modify: `lib/prompts/bookSummary.ts`
- Modify: `lib/prompts/readingGuide.ts`
- Modify: `lib/prompts/viewMap.ts`
- Modify: `lib/prompts/actionExtraction.ts`
- Modify: `lib/prompts/criticalExamination.ts`
- Modify: `lib/prompts/ideaSourceTracing.ts`
- Modify: `lib/prompts/originalReadingValue.ts`

**Interfaces:**
- Consumes: normalized context text.
- Produces: prompts matching approved card responsibilities.

- [ ] **Step 1: Add prompt contract tests if needed**

Use context tests or lightweight assertions to check prompt strings contain required section names and anti-duplication constraints.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: FAIL if prompt contract checks are added before prompt edits.

- [ ] **Step 3: Rewrite prompts**

Apply the approved card structures:

- 全书摘要: problem, core judgment, path only.
- 阅读指南: 阅读定位, 阅读三问, 阅读路径, 重点章节, 当代意义.
- 观点地图: 中心观点, 关键观点, 观点关系, 关键依据, 结构判断.
- 行动提炼: 核心原则, 可执行行动, 触发条件, 适用场景.
- 观点校验: 核心观点复述, 可能存在的问题, 信息噪声, 反例或不同视角, 适用边界.
- 思想溯源: 关键思想谱系, 可能来源, 作者处理方式, 原创程度判断, 原文金句, 总结.

- [ ] **Step 4: Run tests**

Run: `node --test lib/bookAnalysis/context.test.mjs`

Expected: PASS.

---

### Task 5: Verification

**Files:**
- Verify all modified backend files.

- [ ] **Step 1: Run unit tests**

Run: `node --test lib/bookAnalysis/context.test.mjs lib/supportCoffee.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: exit 0.
