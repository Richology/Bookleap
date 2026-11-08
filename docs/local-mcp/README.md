# 本地 MCP 开发与试用

当前发布范围为 Chrome 限定试用，供已持有 Apple Silicon Mac 开发助手的用户进行线上真实书库验收。网页接入、跨来源同步核心、只读 MCP 和桌面试用组件已实现；Safari 扩展、正式签名分发、真实 Codex 用户验收与完整更新切换验收仍有未完成项。不得以单元测试通过替代发布门槛。

## 试用方式

1. 仓库根目录 `npm ci`；`local-mcp` 目录另行 `npm ci`。开发需要 Node；最终应用打包内置运行时，不要求终端用户预装 Node。
2. 在仓库根运行 `npm run dev`，用 **http://localhost:3000/workspace** 打开本机页面。
3. 在 `local-mcp` 运行 `npm start`，或打开已生成的 Apple Silicon 试用 `.app`。本机已验证的缓存运行时构建位于 `local-mcp/dist-desktop-ui/mac-arm64/书跃本地同步助手.app`，使用 Electron 44.9.3。标准依赖为 Electron 45.2.3；其首次下载在 600 秒超时，需重试构建后验证。不把未签名本机构建分发为正式安装包。
4. 桌面组件勾选「允许本机试用网页」。这只新增准确的 `http://localhost:3000` 来源，仍须配对；默认生产来源仅 `https://www.bookleap.cn`。
5. 在桌面组件首次配对前选知识库父目录。只管理其中 `BookLeapLibrary` 专用子目录；非空无标记目录、符号链接会被拒绝。已有配对时不静默迁移目录。
6. 生成五分钟配对码。在网页左侧「本地 MCP」输入来源名称与配对码，了解授权说明并勾选同意；本地组件再次确认准确来源。
7. 看到本地确认时间和书籍数量才算同步成功。体验书默认排除，个人高亮/反思/练习需单独勾选。之后修改、新增、删除和范围变化自动同步；不要把“立即同步”当作日常必经步骤。
8. 在桌面组件点「预览并添加只读连接」，核对新增的 `mcp_servers.bookleap` 内容后确认。已有同名连接会拒绝覆盖，配置变化会要求重新预览。会先生成权限为 0600 的备份；恢复操作不覆盖随后用户的编辑。
9. 点「测试实际 MCP 工具」，这验证真实 SDK stdio 子进程，不等于 Codex 已连接。在 Codex 重连/重启后调用 `library_status`、`list_books` 和 `search_library`，最后由用户确认实际结果。
10. 关闭网页、退出接收组件后，再用 Codex 查询最后成功同步内容。未送达的变化只有网页重开后才会补传。

本机预览页面与线上页面是不同浏览器来源，不能直接访问线上的 IndexedDB。开发自动测试使用新浏览器配置和合成书籍，不读取线上私人书库。用户若要在本机预览真实书库，可自行选择把已有备份迁入试用页面；这是首次试用的数据准备，不是日常同步方式。用户已授权上线 Chrome 限定试用；线上来源需重新配对，不能沿用 localhost 配对。

## Safari

直接 HTTPS → loopback 两种 fetch 在 Safari 27.0.1 实测失败。已提供最小权限扩展与 Swift 原生 handler；见 [Safari 构建说明](../../local-mcp/safari/README.md)。完整 Xcode 27.2 已完成容器与扩展编译，outgoing network entitlement 与本地 ATS 配置已加入；还需 Apple 签名身份，以及真实启用、原生通信与权限拒绝/恢复验证，再完成与桌面组件的自动同步。不能声称 Safari 已可用。

Chrome 在真实 HTTPS 首页完成了合成配对和持久化确认；网页完整自动同步流程在隔离 Chrome 的 localhost 预览验证。浏览器本地网络许可拒绝/恢复、真实用户书库和真实 Codex 验收仍需用户测试。

## 数据与安全

- `library.json` 是 schema 1 完整事务快照，32 MB 单次上限、128 MB 整库上限；只在完整校验、fsync、同目录 rename 后确认。持久化没有第二份内容索引或永久历史副本。
- 一个常驻接收进程持写锁；多 stdio 进程只读。崩溃临时文件会在下次安全打开时清除；只在旧 PID 已不存在时回收写锁，疑似活跃进程不抢锁。
- 来源随机 UUID + 记录 ID 派生稳定 bookId；书名相同不会合并。来源范围的 CAS revision、幂等 requestId、内容摘要防止重试/乱序覆盖。
- 浏览器用 Web Locks 串行化同步，重新读取完整 IndexedDB 事务，保存事件 1 秒合并、每 15 秒复核/重试。读取失败不能发空库；已有来源面对重建的空数据库会拒绝删除，除非存在成功清空事务的元数据标记。
- 配对凭据存于浏览器 `bl-local-mcp-v1`，不在现有备份收集前缀内；恢复备份不会复制配对身份。本地只保存 token SHA-256。重新配对创建新来源，不清除旧来源。
- 凭据绑定准确 Origin 与来源 ID。HTTP 仅监听 `127.0.0.1:48720`，校验 Host、Origin、认证、协议版本、消息 schema/大小。没有未认证写库端点。
- 默认不读个人记录；授权后按每本书 ID 精确读取高亮、反思、跃迁练习与旧练习进度。卡片高亮仍标记 `personal`，不是原书证据。
- 内容分为 `analysis/personal/evidence`。缺少证据明确返回 `evidenceUnavailable`；已有裁剪上下文单独保留。文字是资料，不是 Agent 指令。
- 中文检索为 Unicode NFKC 字面子串匹配，不宣称向量/语义召回；每页最多 50 条，片段最多 2000 字符，结果预算 48000 字符，扫描超时返回可收窄条件的错误；跨更新游标失效后须重新分页。已测 1000 本合成书。
- 暂停、退出和卸载保留库；清除操作需本地确认，删除管理副本与配对，不影响浏览器或其他文件。已发送到 Agent 上下文的数据不能撤回。

## 工具

`list_books`、`search_library`、`get_book_analysis`、`get_evidence`、`library_status`。均只读，stdout 只输出 MCP 协议。返回 bookId、versionId、来源、模块、内容类型与 citationId；本地自定义协议链接打开只读详情，失效引用不能读取旧撤销版本。

MCP 进程只额外在组件运行状态目录写入 PID 存活标记，以避免更新强退仍连接的客户端；不写书库。暂停接收不阻止查询；接收组件彻底退出后仍可以用内置运行时启动 stdio。

## 构建、更新与卸载

- `npm run pack --prefix local-mcp -- --mac --arm64`：本机应用目录。
- Intel Mac / Windows x64 在各自构建机器构建，配置已列出 dmg/zip、NSIS 目标；尚未实测。
- `npm run dist --prefix local-mcp`：发布预检后构建，默认 `--publish never`。没有真实配置/签名时明确失败。
- `release-config.json`（被 Git 忽略）需要真实 `feedUrl`、每平台/架构的 `manifestUrl`、Ed25519 `publicKey`、Windows `publisherName`。不得填示例地址后当成有效发布渠道。
- 签名清单 envelope 的 `payload` 是原始 JSON 字符串，包含 schemaVersion=1、librarySchema=1、platform、arch、version、expiresAt（七天内）、files（url/sha512）；`signature` 为 Ed25519 base64。用 `scripts/sign-manifest.mjs` 签名，私钥路径仅由环境提供。
- 先验证清单签名/平台/有效期，再核对 electron-updater 返回的版本与每个文件哈希；平台签名校验保持开启。默认后台检查与下载，只有无同步请求、无存活 MCP 进程时尝试安装；旧进程不被强制终止。可暂停自动更新或手动检查。
- 当前只允许 schema 1 的兼容更新；需要迁移的更新被拒绝，等待新权限/迁移流程审核，不自动冒险升级数据。没有配置发布渠道时不会联网检查更新。
- macOS 正式分发需要 Developer ID 与公证；Windows 需要 Authenticode 身份。尚未完成真实签名安装器切换、安装失败恢复/回滚实验，不能将单元测试替代这些验收。
- 卸载前关闭自启并退出组件；macOS 移除 `.app`，Windows 用 NSIS 卸载；默认保留 `BookLeapLibrary` 与配置。真实自启/卸载行为还需各平台验收。
- Safari 容器扩展需要另行签名、发布和联合安装验证；Chrome 如需扩展路线，可在 macOS 用 `scripts/register-chrome-host.mjs` 对明确的扩展 ID 注册本机 host，不覆盖已有注册。Windows 原生扩展 host 暂未提供，使用直接 loopback 路线。

## 检查

```sh
npm test --prefix local-mcp
node --test lib/*.test.mjs lib/**/*.test.mjs
npm run lint
npm run build
# 已启动 localhost:3000 后（使用隔离 Chrome 与合成数据）
node local-mcp/test/browser-smoke.mjs
# 用指定构建的独立运行时做隔离桌面、配置与 stdio 测试
node local-mcp/test/desktop-smoke.mjs '/absolute/path/书跃本地同步助手.app'
```

所有测试仅使用合成内容。测试矩阵与未完成项见 [验证记录](bridge-validation.md)。

## 助手名称与运行方式

桌面程序名为「书跃本地同步助手」，网页入口保持「本地 MCP」。首次配对后，网页与助手同时运行时自动同步，无需再次打开面板。关闭助手窗口仅隐藏，后台继续接收；退出助手或暂停会停止新内容落盘。重新打开网页并恢复助手后补同步。已写入的内容由独立 MCP 读取，查询时不依赖助手继续运行。

正式安装后，Mac 可从「应用程序」或 Spotlight 搜索名称打开，Windows 可从开始菜单搜索打开；运行时可使用菜单栏/系统托盘图标。登录自启需用户主动勾选。本机开发 .app 尚未正式安装，可从构建输出目录打开。

改名保留 cn.bookleap.local、bookleap-local-mcp 用户数据目录。旧试用包保留，已有 Codex 命令路径不自动重写；新包放在 dist-renamed，以免覆盖正在运行的旧包。已有配置若要切换应用路径，需另行预览并确认。

### 桌面界面更新

桌面助手采用同步概览、本地书库、连接 Agent、设置四个侧栏页面。配对使用独立弹窗，支持复制配对码；概览显示实际保存数量、配对来源与最近落盘时间。支持系统深色模式、键盘焦点和减少动态效果。

新版试用包位于 `dist-desktop-ui`，保留旧包和既有用户数据目录。退出旧助手后再打开新版；不自动覆盖用户的 Codex 配置。桌面验收在临时目录和独立测试端口 48724 运行，不影响实际接收端口 48720。

界面通用入口使用「连接 Agent」，网页同步与隐私说明不绑定特定客户端。现有配置写入/恢复仍明确标注 Codex 专用；不代表已为 Claude、Hermes 或 Workbuddy 实现自动配置或完成兼容验收。本次文案版试用包位于 `dist-agent-ui`。
