# 划线解释验证

打开精华卡片，选中 1–800 字后点击「解释一下」。选区附近出现解释浮层，保持阅读位置；关闭或 Escape 收起。解释过程保留高亮，失败可重试。成功解释保存在本机高亮中，刷新后悬停高亮选择「查看解释」直接读取缓存，不重新请求模型。生成海报不会覆盖相同范围的已有解释。删除高亮同时删除解释。

## 原文追溯的限制与调整

历史书籍的 `analysisContext.samples` 只保存每个原文抽样前 260 字，并非整本正文。先前划线解释最多选择 8 个抽样，难以稳定找到支持概括性卡片文字的原文。仅凭用户截图不能确定单次请求缺少哪些抽样，但可以确认这一结构性限制。

现在划线解释只提供通俗解读和可选辅助例子，移除原文依据区与引用输出协议；有原文抽样时仍用于辅助理解。例子标题简化为「举个例子」，用图标的悬停说明及无障碍标签标识 AI 生成、非作者原例。新生成的例子要求 30–60 字，不重复附加免责声明；已保存例子保留原内容。工作台独立的卡片证据视图不受影响。

## 本地保存与兼容

复用 `bookleap_highlights_v1:<bookRef>`，新增可选 `explanation: { explanation, example }` 字段，不改变存储键。旧高亮无需迁移。保存失败时不显示已保存；异步请求完成时若高亮已删除，不恢复该高亮。解释包含在现有本地备份的高亮数据中，不提供跨设备同步。

## 验证

```sh
node --test lib/highlights.test.mjs lib/bookAnalysis/*.test.mjs lib/prompts/promptContracts.test.mjs lib/skills/markdownCleanup.test.mjs
npm run lint
npx tsc --noEmit
BOOKLEAP_TEST_URL=http://127.0.0.1:3001 node scripts/selection-explanation-browser.mjs
```

浏览器脚本复用可选 local-mcp 子项目的 playwright-core，需要其开发依赖和本地 Chrome。使用隔离浏览器存储和受控模型响应验证桌面/移动端选择、浮层定位、失败重试、保存和重新查看。真机系统选择菜单仍需 iOS/Android 验证。
