# Safari 容器构建

Xcode 27.2 已编译通过 macOS 容器与原生 handler（本机 ad-hoc 开发签名）。当前系统没有 Apple Developer 签名身份，用户确认暂时没有可用 Team；尚未启用或端到端验证 Safari 扩展，也不具备正式分发条件。

项目：`project/BookLeap Bridge/BookLeap Bridge.xcodeproj`。生成项目随仓库保存；扩展 JS 真源在 `../extension`，Swift handler 真源在此目录。每次构建前运行 `node local-mcp/scripts/prepare-safari.mjs` 同步资源与固定的最小网络设置。

`xcodebuild -project 'local-mcp/safari/project/BookLeap Bridge/BookLeap Bridge.xcodeproj' -scheme 'BookLeap Bridge' -configuration Debug -derivedDataPath local-mcp/safari/build CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build`

以上只用于编译验证。真实试用/发布需要在两个 target 配置同一 Team 的合适签名并重新构建；正式分发还需公证或商店发布。随后在 Safari 设置中仅授权 www.bookleap.cn，验证配对、自动同步、拒绝/恢复、重开和组件中断。

扩展 target 开启 App Sandbox 的 outgoing network；ATS 只设置 NSAllowsLocalNetworking，没有允许任意不安全网络。原生 handler 固定转发到 127.0.0.1:48720 的三个端点；页面来源、路由、消息大小及 token 仍被验证。

不通过允许未签名扩展、关闭混合内容保护或安装根证书来声称兼容。Safari 容器与 Electron 组件目前是两个安装部分；联合安装流程仍待签名环境验证。
