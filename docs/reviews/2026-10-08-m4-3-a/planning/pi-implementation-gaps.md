# Pi 有限差距事实（2026-10-09，已停止侦察）

- 已读本仓唯一入口 packages/adapter-pi/src/index.ts、package.json、既有三契约测试的相关定位、integrations/pi.md、docs05相关定位与docs09:T20；本次无SDK新增阅读/执行。
- package与pnpm-lock.yaml:55–57 均锁官方 @earendil-works/pi-coding-agent 0.87.1；实际官方路径/loader声明复用上包 pi-loader-facts，不新增版本猜测。
- index.ts:33–71 activate只注册八工具；原对象schema通过类型边界保留union，execute同步当前token、传caller signal至sharedcallTool，content为prettyJSON、details为完整result。
- index.ts:74–111 已注册forum-status/getMe与forum-check/getCapabilities，有UI notify和无UI stdout/stderr分支；不是缺少命令，仅指南仍有规划措辞。
- index.ts:8–20 当前token优先env明文，文件读取失败静默匿名；没有MCP/CLI已验四来源冲突、64KiB/sameFD/fatalUTF8/noFallback保护。
- activate本身读取凭据、构造client，但未发HTTP；没有pi.on事件注册，也没有session_start/shutdown/fork/switch/reload资源管理或在途工具登记。
- execute共享单client且每call setToken；没有能力/身份初始化或论坛诊断session绑定，未建立Pi本地session/space/actor关系，也无独立生命周期取消预算。
- 状态命令catch直接输出err.message；没有MCP已验安全typed错误映射或文字容量边界。其兼容改动需父决定，不能宣称当前已修。
- A03/A04测注册形状，S12测错误抛出和预取消；C03测试UI/headless输出、合法union→官方validator→execute路径及HTTP错误字段，均非完整Pi宿主loader/T20。
- docs09:T20明确reload/fork/switch/并行工具无启动副作用、无跨身份串用、无遗留资源；现入口缺对应hook，真实生命周期未由上述mock注册证明。
- 可用无模型候选：官方createAgentSession+显式ResourceLoader、内存SessionManager/SettingsManager、私有空authPath/modelsPath:null；registry wrapper直接execute；具体运行成功仍未验。
- 后续最小候选边界：adapter-pi入口及窄credential/lifecycle模块、真实官方loader合同测试、integrations/pi/guide；不加模型调用或任意文件上传，不复制服务ACL。
- 不可并行点：先冻结凭据/错误兼容与session触发及身份变化政策，再改入口；registry测试需同版loader及transform支持，既有C03断言可能需明确兼容调整而非偷偷覆盖。
- 未确定：完全隔离ModelRuntime/services最小实际构造、shutdown等待出口、fork/switch重建时工具资源的实际处置；未读取全SDK图、未运行宿主，故不填hash或“实测成功”。
