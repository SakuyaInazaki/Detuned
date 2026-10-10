# dsh 无模型组合前置（2026-10-08）

仅官方固定SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；仅读五个相关文件位置（其中测试候选抓取失败），不安装/下载代码/运行宿主、测试或模型。复用[固定版本事实](dsh-pin-facts.md)，产品冻结。

## 本次固定来源

- [MCP README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/mcp/mcp-client/README.md):95–124 指向ToolRuntime/source与公开createMcpToolDefinition；103–107描述apply、发现及dispose。这是插件接口证据，不是完整CLI实跑。
- [tools subsystem](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/docs/subsystems/tools.md):167–205、455以后提供真实ctx.tools API、ToolExecutionInput，无模型调用不是靠伪造模型响应。
- [官方 ToolRuntime source](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/core/tools/src/index.ts):752–800 constructor(ctx,config={})、1880 default export；需要systemPrompt服务。997 register、1187 schemas(scope?)、1290 execute(exec)为公开registry/执行入口。
- [官方 scope source](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/core/scope/src/index.ts):124 createScope(ctx,key,options?)→{ctx,rawDispose,dispose}，通过真实ctx.plugin创建fiber；dispose等fiber惯性，scopeOf读标签。
- MCP `src/index.test.ts` 候选固定rawURL抓取Internal Error；GitHub固定tree目录两次Cache miss。**官方测试真实路径/loader例子仍未定位**，不说没有测试，也不再越过五文件上限猜路径。

## 可确认层次与最小依赖

已确认“MCP真实apply→官方registry发现/execute→scope dispose”的公开接点；尚未确认闭合可执行组合、完整CLI或真实HMR loader。来自同SHA MCP package的版本0.2.1-alpha.1/client2.0.0保持；其余workspace包精确manifest版本本轮未读，不能编造。

最小组合还需同SHA的Cordis、system-prompt、tools、scope、schemastery以及MCP peer链（subprocess/timeout/llm/attachment/util-values等）。ToolRuntime依赖systemPrompt，但native模式不要求PTC runtime；llm导入含HarnessError，不表示构造时已请求模型。底层包安装/构建可行性未验证。

候选真实调用顺序（待父冻结并核依赖）：官方Cordis context安装真实systemPrompt与ToolRuntime(native)→createScope→scope.ctx的官方plugin加载MCP namespace模块（已有async apply）→等待激活→ctx.tools.schemas(scopeKey)/get验证发现→execute({callId,name,arguments,signal,agent?})→scope.dispose等待注销/服务退出。不能直接手调definition.execute后称完整registry验收；agent可选，Agent生命周期隔离与scope并非同一证明。

上述execute是公开pipeline入口，文档没有要求模型先生成toolcall；但Cordis插件加载/await-ready准确接口及systemPrompt实际初始化仍未读，因此**还不能保证整链全程无模型/用户profile**。现已读ToolRuntime constructor仅装prompt工具provider，未出现读取用户profile或发模型请求；不外推所有导入副作用。

应避免未核的dsh CLI/app-boot/shipped profiles/agent-loop入口：它们是否自动加载用户配置或启动模型尚无本轮证据，不应凭名字保证安全。真实HMR watcher/loader实现未读，dispose后重装只可称插件替换，不冒真实HMR已验。后包先由父确定同SHA官方依赖取得边界与真实loader/test入口，再实施隔离无模型实验；本页不造轻量假host或选路线。
