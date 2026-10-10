# Pi 实际 loader 只读事实（2026-10-08）

- 范围：只读已装官方 package、types、随包版本文档及 `integrations/pi.md`；未运行 Pi、模型、测试、安装或读取个人配置。
- 安装位置：`packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent`，package.json 为 **0.87.1**、MIT、Node >=22.19.0；repository 为 `https://github.com/earendil-works/pi` 的 `packages/coding-agent`。
- package 根公开 `dist/index.js`/`dist/index.d.ts`；随包 `docs/sdk.md` 与 examples/sdk 可作为安装版文档，不能把 integrations 的滚动 main 链接当固定版本证据。
- 未发现 package.json 的 gitHead；本次未确认 0.87.1 对应官方 tag/commit。下一验收应保 package/lock 完整性及实际加载文件 hash；未知 commit 不能补猜。

## 实际公开入口

- `dist/core/sdk.d.ts:10–55,107`：`createAgentSession(options?)`，支持显式 cwd、agentDir、modelRuntime、resourceLoader、sessionManager、settingsManager、tools/noTools；默认会触及个人资源，不能直接零参数使用。
- `docs/sdk.md:98–112` 明确自供 ResourceLoader 可完全替代发现；`examples/sdk/12-full-control.ts` 给出了无发现 loader 的完整方法集合。
- `DefaultResourceLoader` 支持 additionalExtensionPaths 与 extensionFactories；随包 `examples/sdk/06-extensions.ts` 明示 `await resourceLoader.reload()` 后供 factory 加载实际 extension。
- `dist/index.d.ts` 公开 ExtensionRunner、wrapRegisteredTool(s)、createExtensionRuntime；runner.d.ts:125–127 有 getAllRegisteredTools/getToolDefinition；wrapper.d.ts:14–19 转为带 runner context 的 AgentTool。
- 因此 registry 的真实工具 execute 可由宿主直接调用，不必通过 prompt/model 生成 tool call；这种调用不等于完成真实模型/TUI 验收。
- `agent-session.d.ts:341–342,597` 另提供 getAllTools/getToolDefinition 与异步 bindExtensions；dispose():void 清 session，但不能仅据此宣称异步 extension shutdown 已等完。
- `extensions/types.d.ts:981–988` 公开 session_start、session_before_switch、session_before_fork、session_shutdown 注册；runner.d.ts:73 的 shutdown 发射 helper 是内部声明，根 index 未直接导出该 helper。
- `agent-session-runtime.d.ts:112–117` 公开 createAgentSessionRuntime(factory,{cwd,agentDir,sessionManager,sessionStartEvent?})，factory 为目标 cwd 创建 session/services，供替换重复使用。
- runtime.d.ts:73–94：switchSession 必需 sessionPath；fork 必需 entryId（before/at 可选）；newSession 参数可省略，均返回 cancelled。switch 需要隔离的有效 session 文件；fork 需要实际已有 entry。

## 隔离与下一验收判断

- `SessionManager.inMemory(cwd?,options?,entries?)`（session-manager.d.ts:377）及 SettingsManager.inMemory（settings-manager.d.ts:179）均公开，可避免真实 session/settings 文件。
- 明确 ResourceLoader、临时 cwd/agentDir 与禁用内置工具可避免项目/profile 自动发现；真实 extension 可以通过指定路径加载，不应仅 mock registerTool。
- ModelRuntime.create 的公开 options 支持 credentials、modelsPath:null、modelsStore、allowModelNetwork:false、refreshOnCreate:false（model-runtime.d.ts:2–20）；无 profile/auth 的完整模型资源组合仍需下包核实 CredentialStore/ModelsStore 实际构造，不能由 SessionManager.inMemory 单独保证。
- 可行结论：安装版有足够公开 loader/registry/runtime 入口支持**无模型推理**的真实 extension 加载与生命周期验收候选；本次未证明任何组合已运行成功，也未确认完全不读模型凭据的最小构造。
- 必要下一事实：固定隔离 modelRuntime/services 的真实创建参数、shutdown 的等待出口及实际 fork/switch 文件资源；不需要新适配框架或模型账户，但这些仍须父冻结后有限验证。

## 最小隔离补查（四文件，只读）

- 查 `dist/core/model-runtime.js:74–100`、`auth-storage.d.ts:43–51`、`sdk.js:69–79`、`agent-session-services.js:53–69`，未调用工厂或读任何 auth 文件。
- 可用根公开 ModelRuntime.create({authPath:新私有目录下空auth.json,modelsPath:null,allowModelNetwork:false,refreshOnCreate:false})：显式 authPath 替代默认 auth；null modelsPath 不取默认 models.json，并自动使用 InMemoryCodingAgentModelsStore，无需调用其内部类。
- AuthStorage.inMemory 虽有官方声明，但根 index 只公开 readStoredCredential；不能假设根导入该类可用。上述新私有文件后端是已公开 ModelRuntime options 的替代路线。
- createAgentSession 显式提供此 modelRuntime、私有 cwd/agentDir、SettingsManager.inMemory、SessionManager.inMemory 与完整 ResourceLoader 时，sdk.js 的各默认文件工厂及 DefaultResourceLoader 分支均被绕过。
- ResourceLoader 必须由调用者显式装载实际 extension；不能用未配置的 DefaultResourceLoader 代替无发现 loader 而声称避免 profile。
- agent-session-services 的高阶工厂仍自行创建 DefaultResourceLoader/reload；不能照搬上述 createAgentSession 条件声称它同样无发现。
- 此路径能隔离真实 profile/凭据文件；不能据四文件证明所有 provider 环境认证都禁用。ModelRuntime 会读取 PI_OFFLINE 的存在性，且将来的模型调用另有环境认证路径，所以验收不得 prompt/stream 或声称零 ambient 环境访问。
- 最小结论：有官方公开的私有空文件凭据 + 内存 models/session/settings + 显式资源 loader 组合候选；是否实际加载/启动成功仍待父授权有限验收，本次无运行证据。
