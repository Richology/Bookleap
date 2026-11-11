# 自动同步桥接验证（2026-11-08）

仅使用合成探针，不读取用户浏览器书库。未部署线上代码。

| 项目 | 结果 |
| --- | --- |
| macOS Apple Silicon | Darwin 27 / arm64 |
| Chrome 156 / `https://www.bookleap.cn` → `http://127.0.0.1:48721` | 带自定义头的 CORS fetch 返回 200，收到探针头 |
| Safari 27.0.1 | WebDriver 启动成功，但创建会话因“允许远程自动化”未开启被拒；尚未验证网页连接 |
| 首次权限拒绝/恢复 | 尚未实测，不改变用户浏览器安全设置 |
| Xcode | 只有 Command Line Tools；无法构建 Safari 容器扩展 |
| macOS 签名 | `security find-identity -v -p codesigning` 返回 0 valid identities |
| Windows / Intel Mac | 无测试环境，待验证 |

## 实施决定与限制

直接 loopback HTTP 作为 Chrome 已验证传输；通过独立传输适配器接入，不把 Safari 支持写成既成事实。Safari 验证完成前保留扩展桥接路线。不能因为 CORS 测试成功就声称初次配对、权限恢复等全链路已通过。核心服务和 MCP 与传输解耦，可独立实现与测试。

采用 Electron 打包共享 Node 核心，附带运行时；MCP 使用官方 TypeScript SDK 的 stdio transport。接收服务为独立常驻进程，stdio 只读持久化库，退出接收组件仍可读最后成功提交内容。单接收服务写入，多个 stdio 读者不占监听端口。知识库事务快照与来源 CAS revision 防止旧请求覆盖；网页跨标签互斥后重新读取 IndexedDB，不从陈旧 React 状态生成快照。

## 正式发布依赖

- Apple Developer ID Application 签名身份、Team ID、公证凭据。
- Windows Authenticode 签名身份及准确 publisherName。
- 更新清单签名密钥、嵌入客户端的公钥和受控 HTTPS 发布地址。
- 如需 Safari 扩展：完整 Xcode、容器 App/扩展 bundle ID、Apple Developer 分发资源。
- 扩展如上架 Chrome/Edge/Firefox，需要相应商店身份。

没有凭据时只提供开发构建，不生成假下载链接，也不关闭签名校验。正式构建脚本必须检查发布配置。

## 官方依据

- [Chrome 本地网络权限](https://developer.chrome.com/blog/local-network-access)
- [WebKit loopback mixed content](https://bugs.webkit.org/show_bug.cgi?id=171934)
- [WebKit targetAddressSpace 回归](https://bugs.webkit.org/show_bug.cgi?id=304164)
- [Apple Safari 扩展分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
- [Electron Builder 自动更新](https://www.electron.build/docs/features/auto-update/)
- [Electron Builder v27 签名要求](https://www.electron.build/docs/migration/v26-to-v27/)
- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server)

## 后续实测记录

- Safari 远程自动化由用户开启后建立隔离会话成功；`https://www.bookleap.cn` 访问 HTTP loopback，普通 fetch 与 `targetAddressSpace: 'loopback'` 均返回 `TypeError: Load failed`。因此需要扩展桥接。
- Chrome 156：真实 HTTPS 首页刷新后探针再次 200；实际 Bridge 的合成配对与完整快照均 200，返回 revision=1、count=1 与持久化确认时间。没有读取首页 IndexedDB 或私人数据。
- 隔离 Chrome + localhost 完整网页：空库配对、新书自动同步、刷新恢复同一来源、暂停保留、恢复、个人内容 opt-in/撤销、排除书籍移除贡献，均通过。
- 核心 Node 测试 11/11：来源隔离、重试/CAS、部分快照拒绝、1000 本中文检索/分页、符号链接拒绝、崩溃前 rename 恢复、配置保留/冲突/恢复、Host/Origin/认证、真实 SDK stdio、更新签名/平台/schema 拒绝与运行中延期。
- 使用官方缓存 Electron 44.9.3 构建的 Apple Silicon 应用目录成功。隔离桌面启动、实际内置运行时 MCP 工具、配置预览/写入/恢复、退出组件后 stdio 均通过。此包未做 Developer ID 签名，不是分发包。
- 标准依赖 Electron 45.2.3 首次下载 600 秒超时；没有以错误版本冒充其构建成功。44.9.3 冒烟构建使用显式命令覆盖与独立 dist-smoke 目录。
- `npm run build` 首次因沙箱阻止既有 Google Fonts 请求失败；允许网络后构建通过。
- `npm run lint`：0 errors / 249 既有 warnings。原项目领域测试 40/40；TypeScript 检查通过。
- 初次依赖审计：运行时 0，构建依赖 6 项 moderate，源于 minimatch（GHSA-g3hv-75wg-m249）。已通过局部 override 固定修复版 11.0.1，当前全量 npm audit 为 0 告警；修复后重新验证打包。未执行强制降级工具链。
- 用户已安装完整 Xcode 27.2 并确认许可；Safari 容器与原生扩展已完成本机 ad-hoc 开发构建。用户确认暂时没有 Apple Developer 签名身份，因此未启用扩展或声称其端到端通过。

## 仍不能算通过的发布项

用户真实书库 Safari + Chrome + Codex 验收；Safari 容器构建/签名与原生消息联通；浏览器初次本地网络许可拒绝/恢复；Windows/Intel 运行；真实登录自启/卸载；签名版本的后台更新、安装失败恢复/回滚。外部发布身份、公证、更新渠道和密钥仍未配置。

最终桌面回归补充：实际合成配对与持久化、暂停后查询、可读书籍/引用详情、缺证据提示、配置恢复，以及退出组件后内置运行时仍读到 1 本已提交书籍，均通过。Chrome 在探针组件停止后明确返回连接失败；合成探针与隔离 Safari 驱动已关闭。

## 未签名测试安装包验收补充（2026-11-08）

用户明确授权先提供未签名 Mac/Windows 测试下载，正式签名不再是本轮前置门槛；自动更新关闭，原正式配置的签名校验不变。

- Windows x64：GitHub Actions run `42452937544` 成功。11/11 核心测试，生成 NSIS EXE，静默安装到独立目录后启动实际 EXE；配对、保存、暂停查询、引用详情、临时 Codex 配置写入恢复、关闭窗口继续接收、退出后 stdio 读取均通过。运行了卸载程序，但未宣称真实用户数据保留和登录自启已完整验收。
- Mac Apple Silicon：由系统 hdiutil 生成 DMG，挂载并用 ditto 复制到独立安装目录后，同一桌面/MCP 回归通过；不是仅测试源码或未复制的构建目录。系统下载隔离提示仍由用户在首次安装时确认。
- Web：安装入口提供 Mac/Windows 下载按钮；详细帮助折叠，配对授权仍显示云模型数据用途。1280×1000 Chrome 下弹窗高度 811px，无内部溢出，三个帮助项默认收起。生产构建通过，lint 0 errors / 249 既有 warnings。
- 公开下载仓库仅包含安装包与帮助文档，私有源码不公开。用户真实书库和真实 Agent 客户端验收仍待线上试用。

## 分发位置调整（2026-11-11）

安装包改由主仓库 `Richology/Bookleap` Releases 托管，取代上文历史记录中的独立下载仓库安排；项目现已按 AGPL-3.0-only 开源。迁移不改变安装包内容，也不代表新增平台或真实用户流程验收。
