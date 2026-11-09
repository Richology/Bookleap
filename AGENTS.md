# BookLeap（书跃）项目指南

本文档是本仓库的工程说明与协作真源，供开发者和代码 Agent 在新环境中快速理解、运行和修改项目。涉及产品定位时以 `PRODUCT.md` 为准；涉及安装和启动时可先看 `README.md`；实现细节最终以代码为准。

## 1. 项目是什么

BookLeap 是一个面向中文深度阅读者的 AI 电子书分析与阅读训练产品。用户可以上传一本电子书，获得结构化分析卡片，并继续完成阅读、证据回看、摘录、训练、导出和分享。

产品不是通用聊天机器人。核心体验是把一本书变成可长期保存、回看和使用的“阅读对象”，帮助用户从被动阅读走向理解、判断、训练与表达。

当前线上主域名为 `https://www.bookleap.cn`，旧域名 `book.richology.cn` 和裸域名 `bookleap.cn` 会在 `next.config.ts` 中 301 跳转到主域名。

## 2. 当前技术栈

- Next.js 16 App Router
- React 19
- TypeScript（严格模式）
- Tailwind CSS 4
- DeepSeek（通过 OpenAI SDK 的兼容接口）
- Ollama 本地回退，默认模型为 `qwen2.5:3b`
- Vercel Blob，用于生产环境的大文件直传
- IndexedDB + localStorage，用于浏览器本地工作区数据
- EPUB、PDF、AZW3、TXT 解析
- JSZip、html2canvas、React Markdown

仓库使用 `npm`，锁文件为 `package-lock.json`。不要混用其他包管理器更新锁文件。

## 3. 页面与路由

### 用户页面

| 路由 | 作用 | 主要文件 |
| --- | --- | --- |
| `/` | 当前正式官网首页 | `app/page.tsx` |
| `/workspace` | 核心分析与阅读工作台 | `app/workspace/page.tsx` |
| `/v1` | 保留的上一版官网 | `app/v1/page.tsx` |
| `/v2` | 当前首页的别名 | `app/v2/page.tsx` |

### API 路由

| 路由 | 作用 |
| --- | --- |
| `/api/analyze` | 接收文件或 Blob URL，解析书名、作者、封面和章节 |
| `/api/upload` | 生成 Vercel Blob 客户端上传令牌 |
| `/api/skills/book-summary` | 全书摘要 |
| `/api/skills/selection-explanation` | 精华卡片划线解释（卡片解读，不提供原文追溯） |
| `/api/skills/reading-guide` | 阅读指南 |
| `/api/skills/view-map` | 观点地图 |
| `/api/skills/action-extraction` | 行动提炼 |
| `/api/skills/view-validation` | 观点校验/批判性审视 |
| `/api/skills/idea-source-tracing` | 思想溯源 |
| `/api/skills/original-reading-value` | 原书阅读价值判断 |
| `/api/skills/workspace-quote` | 工作台推荐句 |
| `/api/skills/poster-content` | 读书海报文案 |
| `/api/skills/book-recommendation` | 书籍推荐 |
| `/api/decision/generate` | 批量生成决策训练题 |
| `/api/decision/generate-one` | 按关生成跃迁练习题 |
| `/api/export` | 生成 Markdown、TXT、JSON、Obsidian 或 Notion 导出包 |
| `/api/feynman-export` | 生成可交互的讲书演示 HTML |
| `/api/export-html` | 兼容入口，转发至费曼演示导出 |

这里的 `lib/skills/` 是应用内部的 AI 内容生成函数，不是 Codex/Claude 的 Agent Skill 目录。

## 4. 主要用户流程

### 4.1 官网

首页通过 `LibraryArrival` 展示书墙聚拢开场动画，然后逐字显示 Hero 标题。后续包括产品对比、工作台故事、六类分析能力、用户评价、FAQ 和结尾 CTA。

首页导航会平滑滚动到对应区块。核心 CTA 进入 `/workspace`。

当前首页导航提供 GitHub 图标入口，在新标签页打开 `Richology/Bookleap`，保留 Star 提示与键盘焦点样式。

### 4.2 初次进入工作台

工作台会显示免责声明、引导层和推荐体验书。体验书位于 `src/data/starterBooks/`，发布版静态包位于 `public/starter-books/`。

推荐书可以在无需上传、无需等待 AI 的情况下直接体验完整结构化内容。修改推荐书内容时，需要同时注意源数据、生成数据、静态包和 `manifest.json` 是否一致。

### 4.3 上传与解析

支持格式：EPUB、PDF、AZW3、TXT。单文件上限为 50 MB，真源在 `lib/fileFormats.ts`。

本地开发默认把文件直接 POST 到 `/api/analyze`。生产环境优先通过 Vercel Blob 上传，再把文件 URL 交给 `/api/analyze`，5 MB 以上启用 multipart。Blob 是临时中转：解析接口只读取本存储库中上传不足 23 小时的对象，生产解析最长 300 秒；本地归档仅处理满 24 小时的对象，二者保留一小时安全间隔。过期上传需重新选择原文件上传。

`GET /api/upload` 公布归档安全窗口，`POST /api/upload` 仍签发直传令牌。本地 `scripts/archive-blobs.mjs` 默认只备份，`--delete` 在核实生产安全窗口、磁盘大小及 SHA-256、云端 ETag 后逐个条件删除。归档位于项目根 `book-archive/`，凭据在该目录 `.env`；整个目录必须同时被 Git 和 Vercel 部署忽略，禁止提交原书、清单、日志或凭据。每 24 小时由 Codex 本机自动化运行，电脑和 Codex 必须可运行；离线或下载失败不删除云端副本。操作与故障恢复见 `docs/blob-archive.md`。

解析层位于 `app/api/analyze/route.ts`：

- EPUB 使用 `epub2`。
- AZW3 使用 `@lingo-reader/mobi-parser`。
- PDF 使用 `pdf-parse`。
- TXT 会自动尝试 UTF-8、GB18030 等编码并分章。
- 解析结果会经过 `lib/bookAnalysis/context.mjs` 做代表章节选择、引用候选提取和上下文压缩。

### 4.4 AI 分析

工作台拿到章节后并行或分阶段请求多个 `/api/skills/*` 路由，形成六张核心卡片：

1. 全书摘要
2. 阅读指南
3. 观点地图
4. 行动提炼
5. 观点校验
6. 思想溯源

同时补充原书阅读价值、工作台推荐句和卡片证据。Prompt 位于 `lib/prompts/`，调用封装位于 `lib/skills/`。

`lib/llm.ts` 是统一模型入口：存在 `DEEPSEEK_API_KEY` 时调用 DeepSeek；不存在时调用 `http://127.0.0.1:11434` 上的 Ollama。

### 4.5 阅读与训练

工作台支持三种阅读视图：

- `overview`：总览卡片。
- `immersive`：逐卡沉浸阅读，可用左右方向键切换。
- `evidence`：查看卡片结论与原文证据。

用户在打开的精华卡片中可以选中最多 800 字进行解释。解释在选区附近的非模态浮层中打开，不改变阅读滚动位置；划线会保存为本机高亮，成功解释保存在同一高亮记录的可选 `explanation` 字段，旧高亮兼容。高亮菜单可查看已有解释，删除高亮同时删除解释。划线解释只做卡片解读，不提供原文追溯；独立的卡片证据视图保持原有功能。移动端选择操作不替代系统菜单，解释浮层限制在屏幕范围内。

用户可以选中文字生成书摘、保存高亮、生成海报，并进入三关“跃迁练习”。训练状态由 `lib/leapPractice.ts` 和 `lib/addictionSystem.ts` 管理，成长记录由 `lib/growthLedger.ts` 管理。

### 4.6 导出与分享

- 精华下载：Markdown、TXT、JSON、Obsidian、Notion 等格式。
- 书摘海报：四套 React 海报模板，最终通过 `html2canvas` 生成图片。
- 讲书演示：`lib/feynmanExport/` 生成单文件横向演示 HTML，包含 magazine 和 swiss 两种风格。
- 本地数据备份：导出和合并导入 BookLeap JSON 备份。

## 5. 工作台布局与菜单

桌面端工作台使用四区布局：

1. 最左工具栏：返回首页、搜索、全屏、跃迁练习、精华下载、书摘海报、讲书演示、咖啡支持、数据备份和联系入口。
2. 左侧书库：体验书、当前分析、上传历史。
3. 中间阅读器：标签页、分析进度、卡片、训练和各类弹窗。
4. 右侧成长区：思考、表达、决策三个维度的成长记录。

顶部标签页支持切换、单独关闭和全部关闭。侧栏在桌面端可固定、折叠或悬浮预览；移动端会退化为纵向布局。

常用快捷键：

| 快捷键 | 功能 |
| --- | --- |
| `Space` | 在不处于输入控件时打开文件选择器 |
| `Cmd/Ctrl + K` | 打开书库搜索 |
| `F` | 切换沉浸全屏 |
| `[` | 展开或收起左侧书库 |
| `]` | 展开或收起右侧成长区 |
| `B` | 打开数据备份 |
| `←` / `→` | 沉浸阅读模式切换卡片 |
| `Esc` | 关闭当前菜单或弹窗 |

## 6. 动画与交互系统

本项目的动画是产品体验的一部分，不应在常规重构中随意删除或统一成一种过渡。

主要动画集中在 `app/globals.css`，交互状态集中在对应 React 组件：

- `LibraryArrival`：书墙加载、书本出现、聚拢、消失和跳过逻辑。
- 首页 Hero：逐字淡入、位移和模糊消散。
- 首页内容：滚动触发、横向评价跑马灯、卡片悬停和结尾书架。
- 工作台：左右抽屉、搜索面板、视图切换、沉浸卡片滑动、证据页进入/退出。
- 上传分析：书本拆解、页张展开、进度流光、步骤脉冲和完成提示。
- 跃迁练习：轨道、扫描线、进度点和关卡反馈。
- 弹窗：`app/hooks/useModalTransition.ts` 提供统一的打开/关闭时序。
- 讲书演示：模板内嵌 Motion/WebGL 动画，并支持低功耗模式。

所有新增动画都应考虑 `prefers-reduced-motion`。现有 CSS 已为主要动画提供降级；修改时不要破坏这些媒体查询。

## 7. 数据存储与换机注意事项

BookLeap 当前没有用户账号和远端数据库。用户数据主要保存在浏览器本地：

- IndexedDB 数据库：`bookleap_workspace_v1`，保存书籍历史记录。
- localStorage：保存高亮、成长记录、训练进度、阅读完成状态、引导状态、当前选择等。
- sessionStorage：保存只在当前会话内有效的提示状态。

`lib/workspaceStorage.ts` 负责历史记录的 IndexedDB 存储与旧 localStorage 数据迁移。`app/workspace/page.tsx` 中的备份逻辑会收集 BookLeap 相关数据，支持 JSON 导出及合并导入。

重要：Git 克隆只会迁移代码，不会迁移浏览器中的书库和训练记录。换电脑或换域名前，应在旧环境按 `B` 导出数据备份，再在新环境导入。不要把用户备份 JSON、电子书原文件或 API Key 提交到仓库。

## 8. 目录地图

```text
app/
  api/                       服务端解析、AI、训练和导出接口
  components/
    landing/                 官网区块与首页动画
    poster/                  海报模板和预览
    workspace/               工作台壳层、侧栏、标签页、工具栏
  hooks/                     UI Hook
  workspace/                 工作台页面和 metadata
  globals.css                全局主题、组件样式和动画关键帧
  page.tsx                   当前官网首页
lib/
  bookAnalysis/              章节抽样、上下文与证据逻辑
  feynmanExport/             讲书演示内容生成和 HTML 模板
  prompts/                   AI Prompt 真源
  skills/                    应用内部 AI 生成函数
  workspaceStorage.ts        IndexedDB 存储
  *.ts / *.mjs               高亮、成长、训练、SEO 等领域逻辑
src/data/starterBooks/       推荐体验书的源数据和适配器
public/starter-books/        推荐书封面、预生成 JSON 和演示 HTML
public/library-covers/       官网书墙封面切片
public/textures/             官网和工作台纹理/精灵图
docs/superpowers/            已完成或进行中的设计规格与实施计划
types/                       跨模块 TypeScript 类型
```

## 9. 关键文件与修改边界

### `app/workspace/page.tsx`

这是当前最大的热点文件，包含工作台大部分状态机、数据迁移、搜索、上传、分析编排和弹窗开关。修改前先定位现有状态和回调，避免重复增加第二套状态。

若新增的是纯展示组件，优先放到 `app/components/workspace/`；若新增的是可测试领域逻辑，优先放到 `lib/`。不要为了“顺便整理”对该文件做大规模无关重构。

### `app/globals.css`

同时承载官网和工作台样式、主题变量及大量关键帧。修改通用变量前，检查 `/`、`/workspace`、`/v1` 以及弹窗/导出预览是否受影响。

### Prompt 与生成函数

Prompt 在 `lib/prompts/`，生成函数在 `lib/skills/`，API 路由只负责输入校验、调用和响应。调整输出结构时，需要同步检查：

- 对应 API 路由的响应字段。
- `app/workspace/page.tsx` 的读取与缓存。
- starter book 预生成数据。
- 导出、海报、证据和训练的下游消费。
- `lib/prompts/promptContracts.test.mjs`。

### 推荐体验书

不要只改 `src/data/starterBooks/*.json` 或只改 `public/starter-books/*.json`。先确认当前文件是源数据、适配后数据还是发布产物，再更新清单和相关测试。

### 本地存储键

localStorage/IndexedDB 的键名属于持久化协议。不要随意重命名。确需修改时必须提供迁移和向后兼容，并验证旧数据仍可读取。

## 10. 环境配置

在项目根目录创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
# 可选；默认值为 https://api.deepseek.com
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

如果不配置 `DEEPSEEK_API_KEY`，需要本机安装并启动 Ollama：

```bash
ollama pull qwen2.5:3b
ollama serve
```

Vercel 部署中使用生产文件直传时，还需要由 Vercel Blob 集成提供 Blob 凭据。不要在客户端代码中暴露 DeepSeek Key 或 Blob 私密令牌。

## 11. 本地开发

推荐使用 Node.js 20 LTS 或满足 Next.js 16 要求的更新 LTS 版本。

```bash
npm ci
npm run dev
```

访问：

- 官网：`http://localhost:3000`
- 工作台：`http://localhost:3000/workspace`
- 旧版官网对照：`http://localhost:3000/v1`

常用检查：

```bash
npm run lint
npm run build
node --test lib/*.test.mjs lib/**/*.test.mjs
```

当前 `package.json` 没有独立 `test` 脚本，测试文件使用 Node 内置测试运行器。新增测试优先保护数据迁移、Prompt 合约、解析和持久化等有业务风险的行为。

## 12. 开发约定

- 使用 `@/` 作为项目根路径别名。
- 保持 TypeScript 严格模式，不用无理由的 `any` 绕过类型。
- 复用现有 CSS 变量、纸张色、墨色和绿色强调色，不引入与品牌不一致的通用 AI 渐变。
- 桌面工作台是首要体验，同时保持移动端功能顺序和可读性。
- 所有主要按钮应保留键盘焦点样式，弹窗应支持 Escape 和合理的焦点管理。
- 动画应表达状态变化，不做无意义装饰；同时维护 reduced-motion 降级。
- 不把电子书正文、用户历史、备份文件、密钥或真实私人数据提交到 Git。
- 只修改当前任务需要的代码；不要顺手重构大型工作台文件。
- 修改文件解析、模型输出或持久化协议后，必须做针对性回归。

## 13. 修改后的最低验证

根据改动范围选择验证，不需要每次手工遍历全部产品：

- 官网改动：检查开场动画、导航锚点、滚动区块、移动端布局和 reduced-motion。
- 工作台 UI：检查空状态、体验书、有上传历史、分析中和分析完成五种状态。
- 上传/解析：至少验证一个目标格式，并检查 50 MB 限制与错误提示。
- AI 卡片：检查 API 成功、模型失败、JSON/Markdown 清洗和旧缓存恢复。
- 存储：刷新页面、重新打开历史记录、导出备份、合并导入备份。
- 搜索：验证 `Cmd/Ctrl + K`、键盘上下选择和结果高亮。
- 沉浸阅读：验证左右切换、证据视图、摘录/高亮和滚动位置。
- 导出：打开生成文件，不只检查接口返回 200。
- 最后运行 `npm run lint`；准备发布时再运行 `npm run build`。

## 14. 当前已知架构事实

- 当前没有登录、云端账户同步或远端业务数据库。
- 浏览器本地数据是用户资产，清缓存、换浏览器、换域名或换电脑都可能导致不可见。
- PDF/TXT 会进入简化分析提示；EPUB/AZW3 更适合完整结构化分析。
- 工作台主页面体积很大，状态耦合较高，是修改时最大的回归风险点。
- `/v1` 是历史对照页，不是当前主首页；`/v2` 直接复用当前首页。
- 讲书演示模板包含第三方代码，许可说明见 `lib/feynmanExport/guizang/LICENSE-AGPL-3.0.txt` 和根目录 `THIRD_PARTY_NOTICES.md`。

## 15. 文档维护规则

`README.md` 为默认英文产品介绍，`README.zh-CN.md` 为对应中文版；两版互链，功能、安装步骤和支持范围应同步维护。产品截图位于 `docs/images/`。

当以下内容发生变化时，同一次提交中更新本文档：

- 新增或删除页面、API、文件格式、模型供应商。
- 改变本地存储、备份格式或域名。
- 增加主要工作台菜单、快捷键或用户流程。
- 改变安装方式、环境变量、构建与部署要求。
- 重组关键目录或移动真源文件。

不要把临时计划或单次任务记录写进本文档；这些内容放在 `docs/`。本文档只保留当前仍然成立、能帮助下一位开发者正确行动的信息。

## 16. 本地 MCP（试用实现）

首次引导分为下载安装、配对书库、连接 Agent；书库名默认填写，配对后的范围与暂停操作收在「同步设置」中。助手默认保存目录可直接使用。手动配置复制必须读取有效配置，不能复制空内容；网页不能将配对成功标为 Agent 连接成功。

- 工作台新增「本地 MCP」入口，必须继续使用 `public/icons/mcp.svg`。`LocalMcpPanel.tsx` 常驻同步控制器，`lib/localMcpAdapter.ts` 只在 IndexedDB 成功就绪后自动同步。
- 本地组件代码位于独立 npm 子项目 `local-mcp/`；使用其独立 `package-lock.json`，不要混入网页依赖。安装与验证见 `docs/local-mcp/README.md`。
- 浏览器配对状态键 `bl-local-mcp-v1` 刻意不在备份前缀中；不要将 token/sourceId 混入可迁移的书库备份。`workspaceStorage.ts` 的完整读取/清空事务标记用于防止重建空数据库误删本地副本。
- 接收服务独立运行，固定 loopback 48720，生产 Origin 精确为 `https://www.bookleap.cn`；本机预览来源需用户在组件中单独开启。来源绑定、CAS revision、schema 校验和原子提交不能省略。
- stdio MCP 只有五个只读工具，查询不依赖接收服务运行。schema 1 目前为原子 JSON 快照和有界中文子串检索；没有向量服务，不承诺语义召回。
- 新增验证：`npm test --prefix local-mcp`；浏览器与打包运行时回归脚本位于 `local-mcp/test/`，只用隔离配置和合成数据。
- Safari 扩展、正式签名/公证、可信更新实际安装恢复及真实 Codex 用户验收仍有未完成项。当前经用户授权上线 Chrome 限定试用，提供 Apple Silicon Mac 和 Windows x64 未签名测试包，优先跑通下载安装与真实书库验收。用户已授权本轮不使用发行者签名；独立 trial 配置关闭自动更新，正式签名校验保持原样。公开下载仓库仅存安装包与说明。网页必须明确未验收平台与更新等缺项，不提供伪造的正式下载链接；全量正式发布仍需完成 spec 验收。

桌面程序显示名为「书跃本地同步助手」，网页入口仍为「本地 MCP」。关闭助手窗口继续后台同步，退出助手停止接收；已同步内容仍可通过独立 MCP 查询。改名时保留内部 appId、包名及原用户数据目录，避免丢失配对与配置。

## 开源与历史清理

仓库目标为 `Richology/Bookleap`，原创应用代码采用 AGPL-3.0-only。保留第三方许可和网站、导出文件的源码入口，不将上游 AGPL 模板改标为 MIT。原书上传目录必须保持 Git 忽略；开源前检查所有分支、标签及 PR 引用。含原书的私有恢复备份不得推送到公开仓库；历史改写后不能合并旧分支将原书带回。
