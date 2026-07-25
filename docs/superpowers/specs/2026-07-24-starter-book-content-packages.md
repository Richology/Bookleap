# 示例书全功能预生成内容包 Spec

**状态：** 已实施，待人工内容与版权审核
**日期：** 2026-07-24
**目标：** 让首次访问书跃的三本赠送示例书可体验当前全部阅读、证据、练习、表达与导出功能；用户使用示例书时不发起任何会调用模型的请求，也不消耗解析 token。

## 1. 背景与现状

书跃当前为首次用户提供三本示例书：《认知觉醒》《原则》《穷查理宝典》。现有 `src/data/starterBooks/*.json` 已预置基础摘要、部分六卡内容、海报及少量练习题；选择示例书时会直接写入页面状态，不会上传文件。

不过它们还不是“完整成品书”：

- 六张卡片中的多项内容由前端基于少量 `summary / insights / actions` 拼接，质量和真实解析书不一致。
- 选择后写入的历史记录没有 `originalReadingValue`，会触发 `/api/skills/original-reading-value` 自动补生成。
- 每本示例书目前只有一题练习；继续后两关会调用 `/api/decision/generate-one`。
- 海报“重新生成”会调用 `/api/skills/poster-content`。
- 费曼讲书演示下载会调用 `/api/export-html`，其服务内部会用模型生成讲书内容。
- 示例书不携带 `cardEvidence`，无法完整展示新加入的来源证据体验。

因此，单纯扩大现有 JSON 不能保证“示例书零 token”。需要把一本示例书定义为一个可版本化的、已审核的**公共内容包**，并让运行时针对该包走完全离线的分支。

## 2. 目标、非目标与产品边界

### 2.1 目标

1. 三本示例书打开后即拥有完整、审核过的六张解析卡片。
2. 示例书可使用原书阅读建议、工作台金句、来源证据、搜索、导出、海报、跃迁练习和费曼讲书演示。
3. 示例书会产生与普通书相同的用户侧状态：答题进度、成长印记、收藏/分享与历史记录。
4. 示例书的默认展示、练习、来源查看及导出路径不调用任何依赖 LLM 的 API 或服务，网络失败也不影响这些功能；用户主动点击海报“重新生成”是唯一例外。
5. 内容更新可追踪、可回滚、可人工审核，不在生产请求中“顺手重算”。

### 2.2 非目标

- 不向用户分发整本受版权保护的 EPUB/PDF/AZW3 或完整解析源文本。
- 不为每个示例书用户动态生成“专属”的练习、讲书稿或新的分析观点；海报仅保留用户主动触发的普通书再生成能力。
- 本期不引入账号、数据库、服务端内容管理后台或异步任务队列。
- 不改变用户上传自己书籍后的现有实时解析与生成流程。

### 2.3 产品口径

示例书提供的是“固定但完整的高质量体验”，而非“按用户个人经历实时定制”。

- 示例书海报保留“重新生成”。用户主动点击后，按普通书的实时生成路径处理；仅首次打开默认海报时读取内容包。
- 跃迁练习可根据用户主动选择的生命资本切换到相应的预设轮次；`自动匹配` 使用内容包声明的默认轮次，不进行模型推断。
- 费曼讲书演示下载的是审核后的预生成讲书内容，根据用户选择的展示风格/导出模式渲染，不重新向模型编排文案。

## 3. 方案概览

```text
运营侧一次性生成并审核
源书（已获授权） → 现有分析链路与人工校对 → Starter Content Package vN
                                                   ↓ 发布为静态文件

用户每次打开示例书
书目 manifest → 按书加载内容包 → 写入用户本地历史/练习状态 → 展示与导出
                                      └────────────── 不调用 LLM ──────────────┘
```

内容包是公共、不可变的阅读成果；用户状态是私有、可变的本地状态。两者绝不混写。

## 4. 内容与存储设计

### 4.1 静态文件布局

将完整内容从当前被客户端直接 import 的大 JSON 中拆出，按需由静态资源加载：

```text
public/starter-books/
  manifest.json
  cognitive-awakening.v1.json
  principles.v1.json
  poor-charlies-almanack.v1.json
```

`manifest.json` 只含书目卡片所需字段：`id`、`version`、标题、作者、封面、推荐语、分类、默认练习轮次和包路径。首页只需这些小数据；用户点选某书后才下载对应内容包。构建缓存与 CDN 缓存可安全复用，因为包内容对所有用户相同。

当前 `starterBooks` 对外接口应保留为一个轻量目录接口，避免波及 `StarterModePanel`、浮动书封面等调用方。新增的异步加载器负责获得完整包并做 schema/version 校验。

### 4.2 内容包逻辑 schema

```ts
type StarterContentPackage = {
  schemaVersion: 1;
  book: {
    id: string;
    contentVersion: string;       // 如 "2026-07-24.1"
    title: string;
    author: string;
    coverImage: string;
    recommendation: string;
    category?: string;
  };
  provenance: {
    generatedAt: string;
    promptVersion: string;
    model?: string;
    reviewedAt: string;
    reviewer?: string;
    sourceRightsNote: string;
    contentOriginLabel: "来自网络";
  };
  analysis: {
    summary: string;
    readingGuide: string;
    viewMap: string;
    actionExtraction: string;
    viewValidation: string;
    ideaSourceTracing: string;
    originalReadingValue: string;
    workspaceQuote: string;
  };
  evidence: Record<CardEvidenceKey, CardEvidence>;
  poster: PosterContent;
  practice: {
    defaultLifeCapital: LifeCapital;
    rounds: Record<LifeCapital, PrebuiltPracticeRound>;
  };
  feynman: Record<GuizangPptStyle, FeynmanHtmlContent>;
};
```

其中：

- `CardEvidenceKey` 仅限现有 6 张卡片的键：`bookSummary`、`readingGuide`、`viewMap`、`actionExtraction`、`criticalExamination`、`ideaSourceTracing`。
- `CardEvidence` 复用现有类型：每张卡 1–4 个 claim，每个 claim 至少一个可溯源短摘录。`quote`、`before`、`after` 都必须受长度限制并人工核对。
- `PrebuiltPracticeRound` 的 shape 与当前 `LeapPracticeRound` 兼容，包含 1 个已固定 `RoundBlueprint` 和连续 3 关 `DecisionScenario`；每个 `LifeCapital` 都有完整三关，三本书共 27 题。
- `feynman` 使用现有 `FeynmanHtmlContent`。每种样式预生成一份可渲染内容，下载时只调用纯 `renderFeynmanHtml`，不调用 `generateFeynmanContent` 或模型。

不在包中存储 `chapters`、`analysisContext`、源文件、整段原文或不受审核的模型中间输出。

### 4.3 体积与版权限制

- 每处展示的原文引文应为验证后、足以支持判断的短摘录；不以“证据”为名下发可复原全书的连续内容。
- 每包应设定压缩后体积预算（建议 ≤ 200 KB）；超过预算时先压缩冗余字段和正文，而不是减少六卡质量。
- 示例书所有展示原文/引文的页面右下角固定显示小字“内容来自网络”；该标记不应用于用户自行上传的任何书籍。
- 该来源提示是产品披露，不等同于取得版权授权。上线前仍应保留来源、审核结论和下架联系人记录，以便处理权利人请求。

## 5. 运行时行为

### 5.1 选择示例书

1. 用户点击任意示例书。
2. 显示现有“正在准备”过渡，但加载实际内容包；加载失败明确提示“示例内容暂不可用，请重试或上传自己的书”，不回退到模型请求。
3. 校验 `schemaVersion`、`book.id`、必填六卡、三轮练习与证据后，原子地应用包内容。
4. 保存一个 `HistoryRecord`，其中写入 `originalReadingValue`、`workspaceQuote`、`cardEvidence`、海报和 `starterBookId/contentVersion`。不写 `analysisContext`。
5. 保持现有“分析完成”、成长印记、打开 tab、搜索索引与阅读进度交互。

### 5.2 必须离线的功能映射

| 用户功能 | 示例书数据来源 | 禁止的模型请求 |
| --- | --- | --- |
| 六张分析卡、原书阅读建议、工作台金句 | `analysis` | 所有 `/api/skills/*` |
| 卡片证据/来源查看 | `evidence` | 证据生成路径 |
| 跃迁练习 | 选中生命资本对应的 `practice.rounds` | `/api/decision/generate`、`/api/decision/generate-one` |
| 海报首次打开 | `poster` | `/api/skills/poster-content` |
| 海报“重新生成” | 按普通书的实时生成流程 | 无（该用户主动动作允许调用 `/api/skills/poster-content`） |
| 书签、搜索、Markdown/Notion/Obsidian 导出 | 已加载的卡片/本地状态 | 无 |
| 费曼讲书演示 | `feynman[style]` + 纯 HTML renderer | `/api/export-html` 及其 LLM 生成流程 |

### 5.3 练习行为

- 首次打开练习时，按用户选择的生命资本加载对应预设轮次；若为 `auto`，加载包的 `defaultLifeCapital`。
- 三关题目、反馈、锚点和生命周期均为包内固定内容，和普通书一致地写入 `localStorage` 的练习进度。
- 用户可切换到另一条生命资本重新开始一轮；这是从另一个预设轮次读取，不是重新生成。
- 旧版示例书本地只缓存一题的用户，升级后应能平滑创建新 round，不丢失完成记录或重复奖励。

### 5.4 历史兼容与更新

- `HistoryRecord` 增加可选 `starterContentVersion`。
- 打开历史示例书时，如果其版本早于 manifest，优先加载当前完整内容包并保留用户的练习/成长状态；不再使用历史记录里不完整的卡片覆盖公共内容。
- 普通用户上传书的历史记录完全维持现状。
- 包版本有问题时，manifest 可回指到上一版本文件，用户无需迁移或清缓存。

## 6. 预生成与发布流程

该流程只在开发/运营环境手动执行，绝不由浏览器或生产 API 触发。

1. 准备用于预生成的示例书源文件，记录网络来源、版本和取得日期。
2. 用现有完整解析链路生成 6 卡、原书建议、金句、证据候选、三条生命资本的练习轮次、海报和两种风格的费曼讲书内容。
3. 运行 schema 校验：字段完整、题目为 3 关、每张卡有合格证据、引文可对应已批准短摘录、JSON 无超长字段。
4. 人工审核内容准确性、可读性、练习质量、引文和版权边界。
5. 写入版本化 JSON，更新 manifest，再在本地以“禁用模型请求”模式完成冒烟验证。
6. 合并发布；保留旧版本文件以支持快速回滚。

本期可先以受控脚本生成初稿，人工补全和审核三本书内容；不要让脚本直接覆盖已发布包。

## 7. 实施范围与顺序

### Phase A：运行时零 token 骨架

1. 定义内容包 TypeScript schema、轻量 manifest 与静态加载器。
2. 扩展 `StarterBookData`/历史记录，支持完整包原子应用和版本字段。
3. 为示例书隔离原书建议 backfill、练习生成和费曼导出分支；海报“重新生成”明确复用普通书实时生成分支。
4. 为包未就绪提供明确失败 UI；不允许隐性回退到 LLM。

### Phase B：三本书内容生产

1. 建立生成/校验脚本和内容审核清单。
2. 生产并审核三本完整内容包。
3. 增加证据、三个生命资本练习轮次和两种风格的费曼内容。

### Phase C：验证与发布

1. 单元测试 schema、加载器、版本升级和历史兼容。
2. E2E/集成测试拦截 LLM API：选择三本示例书、完成三关、首次打开海报、下载讲书演示时，所有 LLM 请求计数必须为 0；主动点击海报“重新生成”时，应恰好走普通书海报生成请求。
3. 手工检查三本书在首次访问、刷新、历史恢复、离线/网络失败后的展示。

## 8. 验收标准

1. 任一示例书从首次选择到六卡完整可见，浏览器 Network 中没有 `/api/skills/*`、`/api/decision/*`、`/api/export-html` 请求。
2. 每本示例书都有完整的原书阅读建议、工作台金句和六张卡的来源证据；证据可正常在 UI 中打开。
3. 每本书可分别完成财富、健康、关系任一轮的 3 关练习，且不调用模型。
4. 示例书的默认海报可打开、导出且不调用模型；用户点击“重新生成”时按普通书走实时生成。费曼讲书演示可下载且不调用模型。
5. 用户上传书籍时，现有解析和生成链路行为不发生变化。
6. 内容包不含源电子书、完整章节文本或连续可复原原文；所有示例书的原文/引文视图右下角均显示“内容来自网络”，用户上传书籍的对应视图不显示该提示。
7. 旧版已体验示例书的用户刷新后可获得完整包，原有个人进度不丢失、不重复发放成长奖励。

## 9. 已确认的产品决策

1. “完整体验”包含费曼讲书演示两种样式的预生成内容。
2. 示例书海报保留“重新生成”；只有用户主动点击该动作时，允许调用普通书的实时生成链路。
3. 三种生命资本各 3 题（每书 9 题）为确定范围。
4. 示例书源文本/引文不具备授权或可接受版权审核路径。所有示例书原文/引文视图必须显示“内容来自网络”；该提示仅作来源披露，不改变内容权利状态。
