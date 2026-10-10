# M3.1 协议接入规划

2026-10-06。已读当前AGENTS/README/docs00/08/11、docs04、C2 next-task；本文件仅规划，未修改产品/正式测试，未build/test。M2本机验收已接受，本包不重复600秒负载。

## 当前事实与最小接线

- `packages/server/src/routes/events.ts:35–49` 已有POST poll，但42行同步调用eventService.poll；wait_ms虽合法未实际等待。
- `packages/protocol/src/events.ts:95–101` HTTP request limit1..100/default20，wait_ms0..25000/default0；`tools.ts:177–182` 同范围可选输入，工具不加默认占位。仍8工具，response与ack形状不迁移。
- `packages/client/src/client.ts:189` 默认每attempt30秒；744行poll与923行forum_poll传递既有signal。超时含fetch及body，清timer/外部listener，UserAbortError与TimeoutError不自动重试。30秒覆盖25秒等待但不是网络完成保证；用户显式更短timeout保持。MCP配置60秒。无需本包改client超时/响应DTO/业务规则。
- `packages/mcp/src/index.ts:58` CallTool handler只接request，不接SDK extra.signal；真实取消链目前在这里断开。SDK shared/protocol.d.ts:175–177声明request extra.signal。最小必要额外所有权为MCP index：handler(request,extra)→client.callTool(...,{signal:extra.signal})，原错误展示保持。
- `packages/adapter-pi/src/index.ts:59–66` execute已传signal到client.callTool；已装agent-core agent-loop.js:490先validateToolArguments，543调用execute并传signal。Pi无需产品修改；真实installed validator→execute和取消由验收核。

核心接口对齐：保留即时sync poll；新增 `pollWithWait(auth,spaceId,consumerId,req,options?:{signal?:AbortSignal}):Promise<PollResponseData>`，HTTP await此入口。业务权限/批次/重投/ack/TTL均由core负责，不在route或adapter复制。

## HTTP取消/关闭映射（待父冻结）

仅在events route插件维护活跃AbortController集合及closing标记。每poll注册req.raw aborted、reply.raw close；后者仅在!writableFinished时取消，避免把正常请求体已结束的req.raw close误判断连。已aborted/destroyed状态提前取消。finally移除两listener和集合成员；无route额外timer，waitdeadline由core scheduler负责。

注册插件preClose：置closing并abort当前wait；onClose发生在连接收束之后，不能用它才启动取消。安装Fastify fastify.js:389在关闭HTTP连接前执行preClose，支持这一最小方案，无需修改app.ts。shutdown的尚连接请求建议503 TEMPORARILY_UNAVAILABLE/retryable，已断连取消不向死socket写500；reply已完成也不重写。客户端timeout→fetch abort→响应连接关闭→core取消；在事务前取消不持久新batch，已持久batch取消后仍由poll恢复，永不自动ack。具体abort分支状态父确认后冻结。

## 所有权与验证边界

候选产品变更仅events route、MCP index；protocol/tool描述可说明有界等待/取消不确认，schema/OpenAPI现范围正确无需机械改。正式新增 `tests/contracts/m3-events-contract.test.ts`，docs04更新实际wait/断连/恢复说明，新增 `examples/events.md`（当前无对应事件示例）。core/storage/旧formal/旧证据不改；发现旧断言冲突先逐条报父。

父批准before后：实际HTTP合法正wait立即返回缺口；MCPstdio取消后HTTP仍存活缺口，记录真实原输出。新正式专项测默认/0即时、正wait截止/新事件/重投即时、空匹配batch即时、非法结构、client timeout与外部cancel、真实断连/正常close不误取消、app.close立即取消和listener收束，批次恢复不ack；具体业务屏障core掌握，route接线可注入服务屏障，真实网络路径由独验补。只新增contracts+必要sourcealias noEmit，不build/fullsuite；统一独验最终build/跨接口与恢复。

## 官方与安装核读

2026-10-06本阶段重新web打开[Pi Extensions](https://pi.dev/docs/latest/extensions)（生命周期、工具execute失败和取消、当前registerMcpServer范围）与[dsh MCP README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)（官方stdio/streamableHTTP、namespace与timeout配置）；不启动真实宿主或模型。Pi当前网页已展示1.0信息，不将其当安装版本。复用同日C1 planning/contracts.md已核读主线types差异：主线ExtensionToolContext与已装ExtensionContext不同；实际执行按安装版。

本阶段direct realpath+package metadata确认coding-agent和其同pnpm目录agent-core实际均0.87.1，读取installed execute签名及validator调用。PATH pi/dsh均不可见，dsh安装版本/真实宿主会话not_tested；不等同全机没有安装。首次package exports解析失败、误找顶层agent-core均仅只读定位错误，随后直接文件路径确认，不据此宣称未安装。没有安装/global配置/模型调用。

## 父批准与实现阶段更新

2026-10-06父已批准上述route/preClose/503与MCP extra.signal方案，产品接线已完成。schema/client/Pi/app.ts不改；核心检查间隔冻结为100ms，每实例128实际等待槽。正式新增7契约项，before两项真实红（另首沙箱EPERM定位保留），新专项7/7及sourcealias noEmit均exit0。最终工程结论仍待独验，不把作者自验当全包验收。
