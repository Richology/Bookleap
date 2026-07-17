# Book Analysis Refactor Design

Date: 2026-07-17

## Goal

Upgrade the backend book-analysis pipeline so each uploaded book is analyzed from a broader, more representative view of the whole book, and the six output cards become denser and less repetitive.

This change does not add an AI reader, a new frontend surface, or complete EPUB reading. The existing workspace UI and six-card experience remain the product surface.

## Current Problems

The current pipeline creates a stronger product promise than the backend evidence supports:

- EPUB parsing keeps only the first 8 usable chapters.
- Each parsed chapter keeps only the first 3000 characters.
- Chapter summaries are generated only for the first 3 chapters.
- Later chapters receive a placeholder summary, which downstream card APIs filter out.
- `book-summary` uses chapter text snippets directly, while the other cards use generated summaries.
- The six card prompts overlap around summary, key claims, usage scenarios, and final evaluation.

The result is effectively a front-loaded analysis. It can work for some books, but it is weaker for books whose main cases, methods, objections, or conclusions appear later.

## Success Criteria

1. The backend no longer bases the core card outputs primarily on the first 3 chapters.
2. The analysis context includes whole-book structure and representative samples from different positions in the book.
3. All six cards consume a consistent analysis context instead of each route rebuilding a different context.
4. The six cards have clearer responsibilities and less repeated content.
5. The quote extraction feature returns only original sentences from parsed source text.
6. The frontend API shape remains compatible with the current workspace flow.
7. Fallback behavior remains available when parsing or model generation fails.

## Non-Goals

- Do not add a full EPUB reader.
- Do not save or expose the whole uploaded EPUB as a readable cloud library.
- Do not add new frontend panels or controls in this iteration.
- Do not require every word of the book to be sent to the model.
- Do not claim perfect full-book understanding. The product should remain a high-quality rapid analysis.

## Backend Architecture

Add a shared internal `BookContext` layer between file parsing and card generation.

```ts
type BookContext = {
  title: string;
  author: string;
  coverage: {
    totalChapters: number;
    sampledChapters: number;
    totalSamples: number;
    strategy: string;
  };
  outline: Array<{
    index: number;
    id: string;
    title: string;
    estimatedChars: number;
    positionRatio: number;
  }>;
  samples: Array<{
    chapterIndex: number;
    chapterTitle: string;
    position: "opening" | "middle" | "ending" | "full";
    text: string;
  }>;
  chapterBriefs: Array<{
    chapterIndex: number;
    title: string;
    summary: string;
    keyPoints: string[];
    evidenceHints: string[];
  }>;
  quoteCandidates: string[];
};
```

The existing `chapters` response remains the compatibility carrier. The backend may attach optional metadata to chapter objects, but the current frontend must be able to ignore it safely. Each skill route should normalize the received chapters into `BookContext` before prompting, so the frontend does not need to send a new payload shape.

## Sampling Strategy

Replace "first 8 chapters" with "whole-book structure plus representative sampling."

The parser should:

1. Read the full spine or generated chunk list.
2. Build an outline for every usable chapter or text chunk.
3. Select representative chapter positions across the book: beginning, early-middle, middle, late-middle, and ending.
4. For long chapters, sample opening, middle, and ending slices.
5. For short chapters, use the whole useful text where budget allows.
6. Keep a total text budget to control latency and token cost.

Recommended first budget:

- Target 12-20 sampled chapter positions for EPUB/AZW3 when available.
- Target 60k-100k source characters before summarization.
- Cap each sample around 1200-1800 characters.
- Keep enough source text to extract real quote candidates.

For TXT and PDF, generate logical chunks first, then apply the same position-based sampling.

## Context Generation

Chapter brief generation should no longer stop after 3 chapters or insert "not generated" placeholders.

Instead:

1. Generate `chapterBriefs` only for sampled chapters or chunks.
2. Each brief should contain:
   - concise summary
   - 2-4 key points
   - 1-3 evidence hints or notable examples
3. If generation fails for one brief, use a deterministic fallback summary from the sample text.
4. Do not pass placeholder summaries to downstream prompts.

All six card generators should receive a normalized context string derived from `BookContext`, including:

- coverage metadata
- outline digest
- sampled chapter briefs
- selected evidence hints
- quote candidates where relevant

## Six Card Responsibilities

### 1. Book Summary

Keep the current intent mostly unchanged.

Purpose:

- Explain what problem the book addresses.
- State the core judgment.
- Describe the overall direction or path.

Constraints:

- Do not output action advice.
- Do not output reading advice.
- Do not output critique.
- Keep it concise and overview-oriented.

### 2. Reading Guide

Upgrade this card without turning it into another summary.

Required structure:

```md
## 阅读定位
## 阅读三问
## 阅读路径
## 重点章节
## 当代意义
```

Purpose:

- Help the user know how to enter the book.
- Preserve "阅读三问" and "当代意义".
- Add reading order, key chapters, and skip/jump-reading guidance.

Constraints:

- "阅读定位" must be short and should not repeat the book summary.
- "阅读三问" must contain 3 specific questions.
- "重点章节" should use outline or sampled chapter evidence where possible.

### 3. View Map

Keep the current strength of this card, but remove "信息噪声".

Required structure:

```md
## 中心观点
## 关键观点
## 观点关系
## 关键依据
## 结构判断
```

Purpose:

- Map the book's idea structure.
- Explain how key claims support or depend on each other.
- Ground the map in chapter-level evidence.

Constraints:

- Do not output action advice.
- Do not critique the book here.
- Do not include "信息噪声"; that belongs to View Validation.

### 4. Action Extraction

Keep the current direction and add trigger conditions.

Required structure:

```md
## 核心原则
## 可执行行动
## 触发条件
## 适用场景
```

Purpose:

- Translate the book into practical behavior.
- Explain when the user should apply each idea.

Constraints:

- Avoid repeating the View Map.
- Actions must be concrete.
- Trigger conditions should answer: "When should I remember and use this?"

### 5. View Validation

Keep the current critical-analysis direction and move "信息噪声" here.

Required structure:

```md
## 核心观点复述
## 可能存在的问题
## 信息噪声
## 反例或不同视角
## 适用边界
```

Purpose:

- Help the user understand limitations, weak assumptions, and boundaries.
- Identify repetitive, low-increment, or rhetorically padded parts.

Constraints:

- Be specific rather than generically skeptical.
- Allow "current evidence is insufficient" when samples do not support a strong claim.
- Keep applicable and non-applicable scenarios separated.

### 6. Idea Source Tracing

Narrow the card to reduce unsupported speculation, but keep a final synthesis.

Required structure:

```md
## 关键思想谱系
## 可能来源
## 作者处理方式
## 原创程度判断
## 原文金句
## 总结
```

Purpose:

- Place the book in a broader knowledge tradition.
- Judge whether the book is original thinking, synthesis, translation, packaging, or popularization.
- End the six-card sequence with a concise final synthesis.
- Include 5 original quotes from the book.

Constraints:

- Do not repeat the first card's summary in "关键思想谱系".
- Do not invent specific source books, authors, or schools when evidence is insufficient.
- "原文金句" must only select from supplied quote candidates.
- Quotes must be copied exactly from source candidates, with no rewriting.
- If fewer than 5 reliable quote candidates exist, output fewer rather than inventing.

## Quote Extraction

The system should extract candidate quote sentences before model generation.

Candidate rules:

- Source must be parsed book text.
- Prefer complete sentences between roughly 30 and 100 Chinese characters, or equivalent English sentence length.
- Exclude headings, copyright pages, navigation text, footers, URLs, boilerplate, and obvious OCR garbage.
- Prefer sentences with clear claims, vivid phrasing, definitions, warnings, or memorable contrast.

The model may rank and select candidates, but it must not compose new quotes.

## API Compatibility

Keep the current frontend-compatible fields:

- `title`
- `author`
- `coverImage`
- `bookSummary`
- `chapters`
- `mode`

The internal richer context should be reconstructed from `chapters` during skill generation. A route may accept optional richer fields if present, but it must not require frontend changes.

Implementation decision for this iteration:

- `/api/analyze` returns representative sampled chapter units in the existing `chapters` field.
- Each returned chapter still has `id`, `title`, and `text`.
- Optional metadata such as chapter index, sample position, total chapter count, and quote candidates may be included on the chapter objects.
- Skill routes normalize these chapter objects into `BookContext`.
- History storage does not need a schema migration in this iteration.

Preferred implementation path:

1. Add shared backend context utilities in `lib/bookAnalysis`.
2. Update `/api/analyze` to produce better sampled chapters and source material.
3. Update skill generators to normalize context consistently.
4. Rewrite prompts to enforce the six card boundaries.
5. Keep frontend rendering unchanged.

## Testing And Verification

Unit tests should cover:

- Representative chapter selection across a 20+ chapter book.
- Short-book behavior where fewer chapters exist.
- Long-chapter opening/middle/ending sampling.
- Quote candidate extraction returns source substrings only.
- Prompt context builders exclude placeholder summaries.

Manual verification should compare at least 3 books:

- A business or self-improvement method book.
- A dense conceptual nonfiction book.
- A narrative or biography-style book.

For each, compare current output against the new output for:

- broader coverage
- less repeated card content
- more useful reading guide
- clearer trigger conditions in action extraction
- information noise moved into validation
- original quotes appearing only as source text

## Rollout

Implement behind existing APIs without frontend changes.

If latency rises too much, reduce sample count before reducing coverage diversity. It is better to sample fewer characters across the whole book than many characters from only the opening chapters.

## Deferred Decisions

1. Whether to store full `BookContext` in history later for richer auditability.
2. Whether "思想溯源" should become optional if source tracing is weak for a given book. This iteration keeps it as a default card, but narrows unsupported claims.
3. Whether to expose coverage metadata to the frontend later. This iteration keeps it internal.
