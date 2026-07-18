# 卡片到原文依据功能设计

日期：2026-07-18

## 背景

当前拆书链路已经完成 `BookContext`、coverage、evidenceBriefs、quoteCandidates 和 6 张卡片职责边界的改造。下一步不是继续增加摘要内容，而是让用户能从卡片里的关键判断回到原文依据，回答一个核心信任问题：

> 这张卡为什么这么写？它依据了书里的哪些原文？

该功能会新增前端页面/视图和交互动画，但不做完整 EPUB 阅读器，不展示整本书全文。

## 目标

1. 用户可以从 overview 卡片或 immersive 卡片进入“原文依据”页面。
2. 每张卡片展示 1-5 条关键判断对应的原文片段。
3. 每条依据必须能追溯到 `sourceId`、章节/段落位置、抽样位置和原文摘录。
4. 用户能在“卡片观点”和“原文依据”之间来回切换，不丢失当前卡片位置。
5. 动效表达“从卡片展开到依据”，而不是跳到完全无关页面。

## 非目标

1. 不做整本书全文阅读器。
2. 不做全文搜索。
3. 不要求每一句卡片文案都有原文依据。
4. 不改 6 张卡片的产品表层结构。
5. 不把完整原文永久存入 history。

## 用户故事

### 1. 从总览卡片查看依据

用户在精华总览看到一张卡片，例如“行动提炼”。点击卡片右下角的「依据」入口后，进入该卡片的依据页，左侧保留卡片摘要，右侧展示支撑这张卡的原文片段。

### 2. 从沉浸阅读查看依据

用户在 immersive 卡片页阅读完整卡片内容。点击顶部的「原文依据」按钮后，当前卡片内容向左收束，依据页从右侧展开。返回时回到同一张卡片。

### 3. 查看单条依据

用户点击某条依据，右侧原文片段高亮对应句子，并显示章节、位置和来源编号，例如：

`S7 · 第 12 部分 · 中段样本`

## 信息架构

```mermaid
flowchart LR
  A["精华总览卡片"] --> B["沉浸卡片页"]
  A --> C["原文依据页"]
  B --> C
  C --> D["依据列表"]
  C --> E["原文片段"]
  D --> E
  C --> A
  C --> B
```

## 新数据模型

### CardEvidence

```ts
type CardEvidence = {
  cardKey:
    | "summary"
    | "reading-guide"
    | "view-map"
    | "action-extraction"
    | "view-validation"
    | "idea-source-tracing";
  claims: EvidenceClaim[];
};
```

### EvidenceClaim

```ts
type EvidenceClaim = {
  id: string;
  claim: string;
  sourceIds: string[];
  supportLevel: "direct" | "inferred" | "weak";
  explanation: string;
  excerpts: EvidenceExcerpt[];
};
```

### EvidenceExcerpt

```ts
type EvidenceExcerpt = {
  sourceId: string;
  chapterIndex: number;
  chapterTitle: string;
  samplePosition: "opening" | "middle" | "ending" | "full";
  quote: string;
  before?: string;
  after?: string;
};
```

说明：

- `quote` 必须来自解析原文或 `BookContext` 样本原文。
- `before/after` 是短上下文，默认各 80-120 字，用于展示原文位置感。
- history 中只保存 evidence excerpts，不保存整本书。
- 老历史记录没有 evidence 时，前端显示“这本书生成时还没有保存原文依据”。

## 原文片段预算

原文依据的目标不是重建阅读器，而是让用户判断“这张卡有没有根据”。因此片段不宜过短，也不宜过长。

推荐预算：

| 层级 | 字数 | 用途 |
| --- | ---: | --- |
| 命中句 `quote` | 30-120 字 | 直接支撑卡片判断的核心句 |
| 前文 `before` | 80-120 字 | 交代这句话在讨论什么问题 |
| 后文 `after` | 80-120 字 | 交代作者如何继续推导 |
| 单条 evidence 总长 | 180-320 字 | 默认展示范围 |
| 单条 evidence 上限 | 400 字 | 只在句子特别长或概念需要完整上下文时使用 |

交互策略：

- 默认展示：`source label + quote + explanation`，大约 120-180 字。
- 用户展开单条 evidence 后展示：`before + quote + after`，大约 180-320 字。
- 不默认展示超过 400 字的片段；超过时折叠为“展开更多上下文”。

成本判断：

- 如果 evidence 使用已解析出的 `BookContext` 样本和 stored excerpts，前端展示 200-300 字不会显著增加模型成本。
- 成本主要来自“为了找更多上下文而重新解析/重新请求模型”。第一阶段不做全书二次检索，只使用当前分析链路已经保留的样本原文和 evidence preview。
- 如果未来要做“点击跳到整本书原文位置”，才需要更大存储和索引成本。

结论：

第一阶段采用“命中句 + 前后短上下文”，默认 180-320 字，最多 400 字。这个范围足够解释一条精华判断，又不会把 evidence 页变成阅读器。

## 后端生成策略

### 第一阶段：随卡片生成 evidence

每个 skill API 返回：

```ts
{
  markdown: string;
  evidence: CardEvidence;
}
```

生成约束：

1. prompt 中要求模型为每个关键判断选择 1-3 个 `sourceId`。
2. 后端只允许返回来自 `BookContext.evidenceBriefs` 或 `quoteCandidates` 的原文句子。
3. 如果模型返回的 quote 无法逐字命中候选，则降级为 `supportLevel: "inferred"`，并只展示 source preview，不展示伪原文。

### 第二阶段：统一 evidence normalizer

新增内部模块：

`lib/bookAnalysis/cardEvidence.mjs`

职责：

1. 从模型输出中解析 evidence JSON。
2. 校验 `sourceId` 是否存在。
3. 校验 quote 是否来自候选或样本文本。
4. 截断 before/after。
5. 为每条 claim 生成稳定 id。

## 前端入口

### Overview 卡片入口

在每张 ready card 的底部增加第二动作：

- 主动作：进入深度阅读
- 次动作：查看依据

低调呈现，避免 overview 卡片变复杂。

### Immersive 卡片入口

在沉浸卡片顶部右侧增加：

`原文依据`

点击后进入当前卡片的 evidence view。

## 新页面/视图

新增 workspace 内部视图状态：

```ts
type WorkspaceReadMode = "overview" | "immersive" | "evidence";
```

`evidence` 不是独立路由，而是 workspace 内的新页面状态。原因：

- 可以复用当前书籍、当前卡片、历史记录和顶部 tab。
- 返回 immersive 时能保留 card index。
- 不需要把原文依据暴露成公开 URL。

## 低保真线框图

### A. Overview 卡片入口

```text
┌────────────────────────────────────────────────────────────────────┐
│  物种起源                                                          │
│  作者：达尔文                                                      │
│                                                                    │
│  完整分析  ›                                                       │
│                                                                    │
│  原书阅读建议 · 强烈推荐读原书                                      │
└────────────────────────────────────────────────────────────────────┘

┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 01 全书摘要    │ │ 02 阅读指南    │ │ 03 观点地图    │
│               │ │               │ │               │
│  摘要内容...   │ │  摘要内容...   │ │  摘要内容...   │
│               │ │               │ │               │
│ 深度阅读  依据 │ │ 深度阅读  依据 │ │ 深度阅读  依据 │
└───────────────┘ └───────────────┘ └───────────────┘
```

### B. Immersive 卡片页入口

```text
┌────────────────────────────────────────────────────────────────────┐
│ ← 精华总览                         3 / 6 观点地图       原文依据 │
└────────────────────────────────────────────────────────────────────┘

                         03 · 观点地图
              ─────────────────────────────────

              本书的核心观点不是“生物会变化”，
              而是自然选择如何在长期时间尺度中...

              ...

┌────────────────────────────────────────────────────────────────────┐
│              ← 上一篇        ● ● ● ● ○ ○        下一篇 →          │
└────────────────────────────────────────────────────────────────────┘
```

### C. Evidence 页面：桌面

```text
┌────────────────────────────────────────────────────────────────────┐
│ ← 返回卡片                         3 / 6 观点地图        依据 4 条 │
└────────────────────────────────────────────────────────────────────┘

┌───────────────────────────┐ ┌──────────────────────────────────────┐
│ 卡片判断                   │ │ 原文依据                              │
│                           │ │                                      │
│ 观点地图                  │ │ ┌──────────────────────────────────┐ │
│ 本书的核心观点不是...      │ │ │ S3 · 第 4 部分 · 开头样本          │ │
│                           │ │ │ “物种不是固定不变的单位...”        │ │
│ 支撑强度：直接             │ │ │                                  │ │
│                           │ │ │ 支撑：说明作者如何提出变化问题      │ │
│ ───────────────────────── │ │ └──────────────────────────────────┘ │
│ 1. 物种变化不是孤立现象    │ │                                      │
│ 2. 自然选择解释机制        │ │ ┌──────────────────────────────────┐ │
│ 3. 长时间尺度很关键        │ │ │ S9 · 第 11 部分 · 中段样本         │ │
└───────────────────────────┘ │ │ “在长期的生存竞争中...”            │ │
                              │ └──────────────────────────────────┘ │
                              └──────────────────────────────────────┘
```

### D. Evidence 页面：选中单条依据

```text
┌───────────────────────────┐ ┌──────────────────────────────────────┐
│ 卡片判断                   │ │ S9 · 第 11 部分 · 中段样本            │
│                           │ │                                      │
│ 2. 自然选择解释机制  ◉     │ │ ...前文上下文...                      │
│                           │ │                                      │
│ 支撑强度：直接             │ │  “在长期的生存竞争中，个体之间微小    │
│                           │ │   差异会逐渐累积，并影响后代延续。”   │
│                           │ │                                      │
│                           │ │ ...后文上下文...                      │
└───────────────────────────┘ └──────────────────────────────────────┘
```

### E. Evidence 页面：移动端

```text
┌────────────────────────────┐
│ ← 返回卡片       观点地图   │
├────────────────────────────┤
│ [判断] [原文]              │
├────────────────────────────┤
│ 1. 物种变化不是孤立现象     │
│    支撑强度：直接           │
│                            │
│ 2. 自然选择解释机制         │
│    支撑强度：直接           │
├────────────────────────────┤
│ S9 · 第 11 部分 · 中段样本  │
│                            │
│ “在长期的生存竞争中...”     │
└────────────────────────────┘
```

## 动效设计

交互沿用 Apple-style disclosure 原则：控件要像从当前卡片自然展开，而不是打开一个陌生页面。核心是空间连续、反馈即时、动画可预测、减少不必要装饰。

### Apple-style 交互原则

1. 入口要轻：overview 卡片里的「依据」是次动作，不抢“深度阅读”的主路径。
2. 动画从触发位置开始：点击哪张卡，evidence 页面就从该卡所在方向展开。
3. 状态要可逆：返回 evidence 前的卡片位置、immersive index 和 scroll position。
4. 不用弹窗遮挡主流程：证据页是 workspace 内视图，不是 modal。
5. 桌面端保持左右空间关系：左侧是卡片判断，右侧是原文依据。
6. 移动端用 segmented tabs：`判断 / 原文`，避免横向挤压。
7. reduced motion 下只做 opacity fade，不做 slide/scale。

### 从卡片进入 evidence

- Overview：点击「依据」后，当前卡片轻微 scale 到 `0.98`，evidence 页面从右侧进入。
- Immersive：当前正文淡出并左移 `8px`，evidence 页面从右侧进入。
- 动效时长：180-240ms。
- easing：`cubic-bezier(0.22, 1, 0.36, 1)`。

### Evidence 内部切换

- 点击左侧 claim，右侧 source excerpt crossfade。
- 不做大位移，避免用户误以为离开页面。
- 选中态用左侧细线和浅底色表达。

### 返回卡片

- Evidence 页面沿进入路径反向退出。
- 返回后保留原 card index 和 scroll position。

### 减少动态

```css
@media (prefers-reduced-motion: reduce) {
  /* 使用 120ms opacity fade，不做 slide/scale */
}
```

## 前端组件拆分

```text
app/workspace/page.tsx
  ├─ EvidenceEntryButton
  ├─ CardEvidenceView
  │   ├─ EvidenceTopBar
  │   ├─ EvidenceClaimList
  │   ├─ EvidenceSourcePane
  │   └─ EvidenceEmptyState
```

第一阶段可以先放在 `app/workspace/page.tsx` 内部，稳定后再拆到 `app/components/workspace/`。

## 空状态与降级

### 旧历史记录

```text
这本书生成时还没有保存原文依据。
重新生成分析后，可以查看每张卡片对应的原文片段。
```

### evidence 不足

```text
这条判断主要来自多处内容的综合推断。
当前没有可逐字展示的单句原文。
```

### quote 校验失败

不展示模型返回的 quote，只展示 source preview，并标记为：

`综合推断`

## 实施顺序

1. 前端 evidence view：新增 `viewMode: "evidence"`。
2. Overview 和 immersive 入口。
3. 使用当前 `StoredBookContext.evidenceBriefs` 派生第一版 evidence。
4. 数据结构：定义 `CardEvidence`、`EvidenceClaim`、`EvidenceExcerpt`。
5. 后端 normalizer：根据 `BookContext` 校验 sourceId 和 quote。
6. 一个卡片试点：先做 `idea-source-tracing` 或 `view-map` 的精确 evidence JSON。
7. 扩展到 6 张卡片。
8. history 持久化和旧记录降级。

## 当前实现状态

第一阶段已完成前端链路：

- overview ready 卡片提供「深度阅读」和「原文依据」两个动作。
- immersive 卡片顶部提供「原文依据」入口。
- workspace 新增 `evidence` 视图。
- evidence 视图使用当前 `StoredBookContext.evidenceBriefs` 派生依据列表。
- 旧记录没有依据片段时展示降级空状态。

仍待后续实现：

- skill API 返回精确 `CardEvidence` JSON。
- `lib/bookAnalysis/cardEvidence.mjs` normalizer。
- 每张卡的 claim 与 sourceId 由模型和 normalizer 协同生成，而不是前端从 brief 中稳定派生。

## 验收标准

1. 用户能从任意 ready 卡片进入依据页。
2. 每张卡至少展示 1 条 evidence；不足时有明确降级说明。
3. 展示的原文 quote 必须来自解析原文或候选片段。
4. 返回后保留原卡片位置。
5. 桌面端依据页不遮挡底部卡片导航。
6. 移动端使用 tabs 切换判断和原文，不横向溢出。
7. `npm run build`、`npm run lint -- --quiet` 和相关 node tests 通过。

## 关键产品取舍

推荐先做“证据页”，不做“原文阅读器”。

理由：

- 用户需要的是信任链路，不是完整阅读体验。
- 当前系统只有抽样原文和 evidence preview，适合展示依据，不适合承诺整书定位。
- 证据页可以自然复用 6 张卡片，不会破坏现有工作台结构。
