# BookLeap · 书跃

BookLeap 是一个面向中文深度阅读者的 AI 电子书分析与阅读训练产品。用户可以上传 EPUB、PDF、AZW3 或 TXT，获得全书摘要、阅读指南、观点地图、行动提炼、观点校验和思想溯源，并继续进行证据回看、跃迁练习、海报分享和内容导出。

- 正式网站：<https://www.bookleap.cn>
- 产品原则：[`PRODUCT.md`](./PRODUCT.md)
- 完整工程指南：[`AGENTS.md`](./AGENTS.md)

## 技术栈

Next.js 16、React 19、TypeScript、Tailwind CSS 4、DeepSeek/Ollama、Vercel Blob、IndexedDB 和 localStorage。

## 在新电脑上启动

建议安装 Node.js 20 LTS 或更新的 LTS 版本，然后在项目根目录执行：

```bash
npm ci
```

创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
# 可选
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

如果没有 DeepSeek Key，应用会改用本机 Ollama：

```bash
ollama pull qwen2.5:3b
ollama serve
```

启动开发服务器：

```bash
npm run dev
```

打开：

- 官网：<http://localhost:3000>
- 工作台：<http://localhost:3000/workspace>
- 旧版官网：<http://localhost:3000/v1>

## 检查与构建

```bash
npm run lint
npm run build
node --test lib/*.test.mjs lib/**/*.test.mjs
```

## 换机时不要遗漏浏览器数据

项目代码可以通过 Git 同步，但书库、分析历史、高亮、训练进度和成长记录主要保存在原电脑浏览器的 IndexedDB/localStorage 中，不会跟随仓库迁移。

在旧电脑的工作台按 `B` 打开“数据备份”，导出 JSON；在新电脑启动项目后，再通过同一入口导入。不要把备份 JSON、电子书原文件或 `.env.local` 提交到 Git。

## 关键目录

```text
app/page.tsx                 当前官网首页
app/workspace/page.tsx       核心工作台与主要状态编排
app/api/                     文件解析、AI、训练和导出接口
app/components/              官网、工作台、弹窗和海报组件
app/globals.css              主题、全局样式和动画
lib/prompts/                 AI Prompt
lib/skills/                  应用内部 AI 生成函数
lib/bookAnalysis/            章节抽样、上下文和证据处理
lib/feynmanExport/           讲书演示导出
src/data/starterBooks/       推荐体验书源数据
public/starter-books/        推荐书发布产物
```

更完整的页面地图、菜单与快捷键、动画系统、存储协议、修改边界和验证清单，请阅读 [`AGENTS.md`](./AGENTS.md)。

## 本地 MCP（本地试用，尚未发布）

工作台左侧「本地 MCP」用于把已授权内容自动同步到电脑，再由 Codex 通过只读 MCP 查询。网页关闭或接收组件退出后仍可读最后成功同步内容；个人记录需单独选择。当前实现与试用步骤见 [本地 MCP 文档](docs/local-mcp/README.md)。

本地组件为独立 npm 子项目 `local-mcp/`，最终安装包内置 Electron 运行时。Safari 需要原生扩展桥接，已编译通过但缺签名与实测；Windows/Intel Mac 尚未实测。正式签名、公证、更新渠道及用户真实书库验收未完成，不提供公开下载地址，也未部署线上。

桌面程序显示名为「书跃本地同步助手」，网页入口仍为「本地 MCP」。关闭助手窗口继续后台同步，退出助手停止接收；已同步内容仍可通过独立 MCP 查询。改名时保留内部 appId、包名及原用户数据目录，避免丢失配对与配置。

### 本地 MCP：Chrome 限定试用

目前面向已有 Apple Silicon Mac「书跃本地同步助手」开发包的 Chrome 用户，供线上真实书库与 Agent 验收。尚无正式安装包下载；Safari、其他浏览器、Windows/Intel 以及签名更新、回退、自启与卸载尚未完成验收。线上与 localhost 须分别配对。详见 [试用与未完成项](docs/local-mcp/README.md)。
