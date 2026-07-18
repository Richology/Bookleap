# 拆书分析重构状态对齐

日期：2026-07-17

目的：把原始 spec、当前代码实现、以及后续产品决策放在同一张表里，避免不同账号基于不同上下文反复覆盖彼此的改动。

本文件是继续迭代前的共同基准。除非用户重新确认，后续实现应优先按这里的状态判断，不要只按原始 spec 或单个 agent 的口头判断行动。

## 状态定义

- 已完成：当前代码已经满足 spec 的核心要求。
- 已确认偏离：当前代码与原始 spec 不一致，但属于后续产品决策或刻意取舍，不作为 TODO。
- 待完成：当前代码与 spec 的硬约束或验收要求仍有差距，需要后续实现或验证。
- 待确认：当前代码可工作，但是否继续增强需要产品判断。

## 已完成

### 1. 后端不再主要依赖前 3 章

Spec 要求：核心卡片输出不再主要依赖前 3 章，分析上下文应覆盖全书结构和不同位置的代表性样本。

当前实现：

- `app/api/analyze/route.ts` 会先解析 EPUB spine、AZW3 spine、TXT/PDF chunk，再调用 `toAnalysisChapters(...)`。
- `lib/bookAnalysis/context.mjs` 中 `selectRepresentativeChapters(...)` 默认按全书位置选取最多 16 个章节/文本块。
- 长章节会被拆成 opening、middle、ending 三段样本。
- 总样本文本预算默认控制在 90000 字符。

状态：已完成。

### 2. API 形状保持前端兼容

Spec 要求：保留 `title`、`author`、`coverImage`、`bookSummary`、`chapters`、`mode`，不要求前端改 payload。

当前实现：

- `/api/analyze` 仍返回原有字段。
- `chapters` 内每项仍包含 `id`、`title`、`text`。
- 额外上下文放入可选的 `analysisMeta`，前端可以忽略。

状态：已完成。

### 3. 统一 BookContext 层

Spec 要求：在解析和卡片生成之间新增共享 `BookContext`，各 skill 路由统一归一化上下文。

当前实现：

- `lib/bookAnalysis/context.mjs` 提供 `buildBookContext(...)` 和 `formatBookContextForPrompt(...)`。
- `app/api/skills/book-summary/route.ts`、`reading-guide`、`view-map`、`action-extraction`、`view-validation`、`original-reading-value`、`idea-source-tracing` 都使用该上下文构建逻辑。
- formatted context 包含覆盖范围、目录摘要、证据片段索引、抽样章节摘要、原文金句候选。

状态：已完成。

### 4. prompt 职责边界已按当前产品版本收紧

Spec 要求：6 张卡片减少重复，按各自职责输出。

当前实现：

- 全书摘要 prompt 明确禁止行动建议、阅读建议和批判意见。
- 阅读指南 prompt 包含阅读定位、阅读三问、阅读路径、重点章节、当代意义。
- 观点地图 prompt 包含中心观点、关键观点、观点关系、关键依据、结构判断，并禁止信息噪声和行动建议。
- 行动提炼 prompt 包含核心原则、可执行行动、触发条件、适用场景。
- 观点校验 prompt 包含核心观点复述、可能存在的问题、信息噪声、反例或不同视角、适用边界。
- 思想溯源 prompt 收窄为来源类型、作者处理方式、原创程度、原文金句和总结。
- `lib/prompts/promptContracts.test.mjs` 会检查每张卡片必须保留的章节名和关键约束。
- 思想溯源测试明确锁定当前产品标题：`核心思想来源`、`思想来源拆解`。

状态：已完成。

### 5. compact analysis context 已存入历史记录

Spec 原文把完整 `BookContext` 存 history 列为延后增强。

当前实现：

- `app/workspace/page.tsx` 中 `buildHistoryAnalysisContext(...)` 调用 `buildStoredBookContext(...)`。
- `buildStoredBookContext(...)` 只保存 coverage、outline、sample preview、evidence preview 和部分 quote candidates，不保存完整样本文本。

状态：已完成一个更保守的 compact 版本。不是 schema-heavy 的完整 context 存储。

### 6. 金句输出已有代码级最终校验

Spec 要求：

- 金句只能从 `quote candidates` 中选择。
- 必须逐字复制候选原句，不能改写。
- 候选不足 5 条就少给，不能补编。

当前实现：

- `extractQuoteCandidates(...)` 会从解析文本中提取候选句。
- `formatBookContextForPrompt(...)` 会把候选句传给模型。
- `extractQuoteCandidatesFromAnalysisContext(...)` 会从格式化上下文中还原候选句集合。
- `cleanupIdeaSourceTracingMarkdown(...)` 会校验 `## 原文金句` 小节，只保留逐字命中候选句的条目。
- 如果模型输出没有任何逐字匹配项，代码会保留提示，不会补写模型未选择的候选句，也不会保留编造句。

状态：已完成。

### 7. chapterBriefs 已补轻量关键点和依据提示

Spec 要求：每个 brief 包含简洁摘要、2-4 个关键点、1-3 个依据提示或代表性例子。

当前实现：

- `buildBriefs(...)` 会继续保留 summary fallback，不调用模型。
- 每个 brief 会从样本文本中提取最多 3 条较完整、有信息量的原文句子作为 `keyPoints`。
- `evidenceHints` 会复用这些原文句子，最多 3 条；如果没有合适句子，则保留短预览 fallback。
- `formatBookContextForPrompt(...)` 会在「抽样章节摘要」里输出 `关键点` 和 `依据提示`，让下游 6 张卡片实际看到这个中间层。

状态：已完成轻量规则版。没有引入额外模型调用，因此不会明显增加延迟或成本。

### 8. lint 已达到 exit 0

Plan 要求：`npm run lint` exit 0。

当前实现：

- 修复了新 prompt contract 测试中的 `module` 变量命名问题。
- 修复了既有 UI 组件中 5 个 `react-hooks/set-state-in-effect` error。
- `npm run lint` 现在 exit 0。

状态：已完成。当前仍有 warnings，主要来自 `<img>` 提示、未使用参数提示和 minified vendor 文件，但不再阻塞 lint 命令。

### 9. 覆盖范围元数据已展示到前端

Spec 将覆盖范围元数据列为延后增强。

当前实现：

- `BookContext` / stored context 中已有 coverage、outline 和 samples。
- 工作台 overview 的书名区默认只显示分析深度；点击展开图标后显示覆盖范围详情。
- 当前会话从 `chapters` 现算 coverage；历史记录只读取 `record.analysisContext`。
- 展开内容包括：全书结构段数、代表章节段数、分析片段数、是否覆盖结尾/代表性分布。

状态：已完成。没有新增前端页面或面板，只在标题区增加可展开的覆盖范围说明。

## 已确认偏离

### 1. 思想溯源前两个标题

Spec 原要求：

```md
## 关键思想谱系
## 可能来源
```

当前实现：

```md
## 核心思想来源
## 思想来源拆解
```

原因：用户在后续对话中明确说明这是之前要求上个账号修改的产品表达。

处理原则：

- 不把它作为 TODO。
- `markdownCleanup` 当前会把旧标题归一化为当前产品标题。
- 后续不要再按原始 spec 自动改回。

状态：已确认偏离。

## 待完成

### 1. 人工验收记录缺失

Spec 要求：至少比较 3 类书：

- 商业或自我成长方法论书。
- 高密度概念型非虚构书。
- 叙事类或传记类书。

当前实现：

- 代码层单测和 build 已通过。
- 没有看到记录化的三类书人工验收结果。
- 当前仓库只有 starter book 的成品 JSON 数据和封面，没有可上传解析的 EPUB/PDF/TXT 样书文件。

缺口：

- 无法证明实际输出已达到“覆盖更广、重复更少、阅读指南更有用、行动触发条件更清晰、金句来自原文”的产品验收目标。
- 需要用户提供或指定 3 本样书，才能严格完成该验收。

建议做法：

1. 选择 3 本测试书，各跑一次完整分析。
2. 用固定表格记录：覆盖范围、样本是否包含结尾、卡片重复度、行动触发条件、信息噪声位置、金句来源。
3. 将结果写入 `docs/superpowers/plans/2026-07-17-book-analysis-manual-verification.md`。

优先级：中。理由：这是上线验收，不一定先于代码补强，但需要在发布前完成。

## 建议执行顺序

1. 提供或指定 3 本样书，完成三类书人工验收记录。

## 当前可依赖验证

最近一次已确认：

- `node --test lib/bookAnalysis/context.test.mjs lib/skills/markdownCleanup.test.mjs` 通过。
- `node --test lib/bookAnalysis/context.test.mjs lib/supportCoffee.test.mjs` 通过。
- `node --test lib/prompts/promptContracts.test.mjs` 通过。
- `npm run build` 通过。
- `npm run lint` 通过，仍有 warnings 但 exit 0。
