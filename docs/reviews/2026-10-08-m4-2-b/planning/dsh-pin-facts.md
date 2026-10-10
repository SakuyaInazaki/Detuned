# dsh 固定版本前置事实（2026-10-08）

本轮只读；产品保持冻结。复用[A包官方事实](../../2026-10-08-m4-2-a/planning/dsh-official-facts.md)，未启动宿主/模型、安装、读取私人配置或修改依赖。

## 三种确认方法的实际结果

1. 官方 [GitHub refs API](https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/heads/master)：web工具返回URL不可访问/Internal Error，没有SHA。
2. `git ls-remote https://github.com/deepseek-ai/deepseek-harness.git refs/heads/master`：exit128，`Could not resolve host: github.com`；没有下载对象/更改仓库。
3. 官方 [master commits Atom](https://github.com/deepseek-ai/deepseek-harness/commits/master.atom)：web工具拒支持 `application/atom+xml`（400），未取得commit内容。

三种已达本轮上限，未反复重试或权限绕行。**本轮未确认当前 master 的固定commit；不能将滚动0.2.1-alpha.1材料称为锁定版。**

## 已有材料与不可外推处

前包已读官方历史 [c291e7961a515f6d7af9304e7fd1d257929aef26](https://github.com/deepseek-ai/deepseek-harness/commit/c291e7961a515f6d7af9304e7fd1d257929aef26)，但未证它包含当前滚动MCP实现；本轮不混用其commit与master package/README/index，也不将它选为实现目标。

尚未固定，所以没有进行“固定commit三文件与master一致”核对。待可确认官方SHA后，同SHA的 `packages/mcp/mcp-client/package.json`、README、src/index.ts 必须一起核；版本、SDK2.0依赖、apply/export/scope/HMR行为以该组文件为准，不能沿用网页最新值冒认证。

## 无模型真实入口的前置依赖

已核滚动MCP公开async apply、createMcpToolDefinition与ctx.tools注册，只证明插件/工具API，不证明完整loader/HMR无模型路径。仍缺固定版Cordis loader/插件激活与dispose公开入口、ToolRuntime实例及执行上下文构造、scope创建/销毁入口的同版本依赖闭合证据。

后包若走真实loader/registry无模型验收，需父先确定可取得的固定源码/运行依赖及许可边界；再核不触发模型的启动/实际工具调用/重载关闭入口。当前shell dsh不可用事实保持，不安装替代，不自建仿宿主framework。本页不选实现路线。

## 父批准匿名网络补核（替代上文未核结论，保留原失败）

一次require_escalated只读ls-remote成功exit0：master=`5badb15009ae1756c3afe0ae0cef1faafc290ccc`。workdir=/private/tmp，env -i、PATH=/usr/bin:/bin、GIT_CONFIG_NOSYSTEM=1、GIT_CONFIG_GLOBAL=/dev/null、GIT_TERMINAL_PROMPT=0、GIT_ASKPASS=/usr/bin/false、credential.helper空；没有登录/用户配置读取/对象下载或文件修改。
同SHA [package.json](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/mcp/mcp-client/package.json) 已核：0.2.1-alpha.1、MIT、MCP client2.0.0、root及src/*公开exports；与之前滚动版本字段一致。
同SHA [README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/mcp/mcp-client/README.md) 已核：probe→服务、scope命名、重连/HMR与公开适配器说明均与滚动材料关键行为一致，非逐字hash一致声明。
同SHA [index.ts](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/mcp/mcp-client/src/index.ts):23/31/109/142/149–185 已核createMcpToolDefinition出口、inject tools、Config、async apply、scope reservation、dispose effect和initial ready；与滚动关键公开入口一致。
固定版loader/ToolRuntime/scope实际无模型组合仍未核，前置依赖缺口保持；本次只核父批准三文件，没有下载/安装/运行宿主或自启实现。
