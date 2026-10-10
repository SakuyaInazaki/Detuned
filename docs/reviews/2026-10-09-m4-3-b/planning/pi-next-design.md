# 后续 M4.4-A：Pi 接入设计方向（未实施）

当前实施路线仍为 M4.3-B。本页只记录父选择，不创建 API、测试或空包；事实依据为上包 [Pi 差距](../../2026-10-08-m4-3-a/planning/pi-implementation-gaps.md) 与 [官方 loader 事实](../../2026-10-08-m4-2-b/planning/pi-loader-facts.md)。

## 已选边界

1. Pi 复用 `@detuned/client/node` 安全 token resolver。来源冲突、所选文件读取失败明确拒绝，不匿名 fallback；单 runtime 固定身份凭据快照，更换须显式重建，不在并发调用中共享 mutable token。
2. 将已验 MCP 惰性 capabilities/me 与 per-space **诊断 session** 协调抽为不依赖 MCP/Pi 的 shared client 模块，由两 adapter 复用。具体文件/API 留实现前有限核定；不把 MCP SDK 引入 client/browser，不复制服务 ACL，不增加逐帖 session_id 或业务字段。
3. Pi 工具/命令沿已验安全 typed 错误处理，保持完整 details 与有界 text；八 schema 单源与官方 validator 保真。响应错误不能伪装成功，不能把 schema 通过等同权限批准。
4. 依实际官方 session 生命周期分代管理连接资源。switch/fork/new/reload/shutdown 取消旧在途并等待 finally，不自动 ACK；懒初始化/extension 注册不联网或启动模型。具体 hook、事件名及可 await 的关闭出口尚须验证，不臆造事件或以同步 dispose 代替清退证明。
5. 先验证真实官方 createAgentSession/显式 ResourceLoader 的最小无模型 prototype，再实施映射。使用 private cwd/agentDir/authPath、内存 settings/session、modelsPath:null、禁模型网络刷新；禁止真实 profile/key、prompt/stream。离线设置不能被外推为 SDK 完全不访问环境。

## 两个可审阅交付包候选

- **共享基础**：有限核定抽取的身份/session 协调 API、Node 凭据与安全错误/结果组合；保持 MCP 已验行为、browser 无 Node/MCP 依赖。先有 fresh baseline，再实现与定向验证。
- **Pi 真实生命周期与指南**：先真实官方 loader prototype，后接入工具/命令、分代取消、身份/空间映射及 reload/fork/switch/shutdown 有限无模型验收；同步 integrations/pi 与指南，不宣称模型或所有宿主完成。

兼容变更须明确同步旧 C03 的凭据 fallback、动态 token、UI/headless 错误输出期望，保留原失败证据；不能为新策略悄悄改旧断言。协议、SQL、服务权限与论坛业务字段不在此设计范围。具体所有权、限额与验收矩阵由父在开工前冻结，本页不表示已实现。
