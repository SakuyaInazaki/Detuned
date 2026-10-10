# M7.4-E native-first 静态根因定位

范围：只读 frozen Codex probe、固定 0.144.6/337 schema、官方 rust-v0.144.6 对应实现及现存 first 结果。未运行 syntax、test、native、build；未读取用户配置、账号或父环境。未改 source。源码 SHA256 aee7ec48fb050f8aaa6ba70307bba2164497579d0e676a459fab2470808a0430。

## 已存观测

verification/codex-native-first-result.json：owned thread detuned startup starting→ready；40 次 mcpServerStatus/list 返回 detuned 一项、tools 空对象、nextCursor 无；tool call 0、无 deadline；ACK、所有权证明与清退均成功。现有安全报告没有保存 snapshot launcher 的失败原因，不能声称实际捕获了 EEXIST。

## 已排除的契约错误

probe 第109行 thread/start 的响应 thread.id 直接用于第110行 list 的 threadId；detail=toolsAndAuthOnly，提取 data[].name=detuned 后 tools 对象值的 name。固定 generated-protocol/v2/ListMcpServerStatusParams.json 只有 cursor/detail/limit/threadId；没有 includeTools。detail 的两个值为 full/toolsAndAuthOnly，默认 full。响应 schema 的 tools 是对象。

官方 [McpRequestProcessor](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/app-server/src/request_processors/mcp_processor.rs) 的 list_mcp_server_status（212–241）有 threadId 时 load_thread，读取该线程配置与 runtime context；只有无 threadId 分支才使用 global 配置。因此当前参数不是误查 global。list_mcp_server_status_response（285–296）将 detail 原义传入 snapshot；返回工具来自 tools_by_server，没有该键时才生成空对象（334）。当前 nextCursor false 与单项结果一致，未有分页遗漏证据。

## 确定的实现不兼容：snapshot 重开 stdio，launcher 单次登记

官方 [snapshot 实现](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/codex-mcp/src/mcp/mod.rs) 的 collect_mcp_server_status_snapshot_with_detail 每次建立新的 McpConnectionManager；它接收配置/runtime context/cache，而非线程已就绪 manager。collect_mcp_server_status_snapshot_from_manager 调用 list_all_tools；detail 只控制 resources/resource_templates，不会省略 tools。

官方 [McpConnectionManager::new/list_all_tools](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/codex-mcp/src/connection_manager.rs) 为每个 enabled server 创建 AsyncManagedClient（169–236）。共享 cache 仅由 should_share_codex_apps_tools_cache 判定的 Codex Apps 使用，不能把 detuned 的 ready tools 当作 snapshot cache。list_all_tools 在 listed_tools 返回 None 时跳过该 server（495–505）。

官方 [ManagedClientStartup/make_rmcp_client](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/codex-mcp/src/rmcp_client.rs) 的启动链调用 make_rmcp_client（293–325）；Stdio 分支调用 RmcpClient::new_stdio_client，使用配置的 command/args/env（905–940）。listed_tools 在启动失败时仅尝试 cached_tools（489–505）。

当前 production createTrustedCodexMcpLauncher（source24–28）对同一个 privateRoot/mcp-pid 执行 writeFile(flag=wx)，然后等同一个 mcp-ack 的自身 PID；第一次 thread transport 已登记并获 ACK，文件一直保留至 cleanup。后续 snapshot transport 再执行该 launcher，既存文件会使登记失败并阻止 initialize。即使简单把 wx 改为覆盖，也会破坏首 PID authority，且原 ACK 不匹配新 PID；supervisor 第164行 watcher 只收一个候选并返回。该冲突是静态已证缺陷；first 实际空工具由它造成属于强支持推断，尚无逐 snapshot EEXIST 观测。

## 根决策建议

唯一候选为上述 snapshot/单次握手不兼容，不另设 auth、慢启动或工具投影候选。最小修复方向是在现有固定 launcher/control 范围内支持每次真实 transport 的独立候选登记与 PID 专属 ACK，逐个仍走 exact ownership→observer→final gate；保留全部 candidate/confirmed authority 至 cleanup，保持原预算、方法和 signal 边界。不能只覆盖/删 mcp-pid 或复用首 ACK。这需要 root 明确选择新的多实例握手范围，当前不实施。

若根要求先辨别实际归因，唯一有限诊断建议：在 production launcher 的登记失败分支仅计固定 enum registration_exists，以及 bounded launch-attempt count，不输出 PID/path/error/stderr；由 D 在授权的单次既有40poll normal 中核对。现存 first 证据保留不改，是否增加观测或直接设计修复由 root 决定。

## 多候选映射与最小边界（root 请求补充）

source runNativeCodexCheckProbe：registrationTasks、mcpCandidates、confirmedMcpGroups 已是 Set；cleanup 对所有 candidate PID 做 presence-only absence，对全部 confirmed PGID 清退/absence，rootSafeToRemove 要求两个集合全部 absence。这些容器/清退循环可复用。mcpWatch 当前 mcpCandidates.size===0、单个 mcpPID、单个固定文件、成功 return，且布尔/placement/phase 仅表示一个实例；这些不是已有多实例协议。proveCodexMcpOwnership 保持完整1015字节/SHA0202f11b6071607d6180aa833eeb39c42f82a1a2ba019c3df47ea650b9e2acf1。

E verification/codex-bounded-capture.mjs：registry entries、registeredMemory 和 ownershipTasks 支持多行，但 driver 与 outer 的 mcp_registered 都用 find(first mcp_spawned)，ownership_ack 只按 stage 匹配，normal stages 固定六行，coverage 断言 candidates/proofs===1。不能直接重复 observer：须按 PID 匹配 candidate/confirmed/observer ACK，并持久化每一 proof 后才放行。现有 signal authority 集合及 candidate absence 循环可复用，不能以最后 proof 覆盖此前实例。

最小支持 owned thread + 一次 status discovery 两个登记涉及同一 Codex source 的 production generator、mcpWatch、diagnostic coverage，以及 D-owned capture driver/outer/test/evidence；产品 MCP、Claude/Pi、固定binary/schema均不需修改。登记与 ACK 文件必须逐 PID，限制允许实例数并保留异常候选；每个实例独立 exact proof/observer/finalgate/ACK。现有40poll会在发现成功后break，但失败路径可能产生超过两个 transport；根须明确失败重试的有界实例上限及 fail-closed/保留策略，不能仅容许2后忽略其余候选。风险是未经登记的短命或独立PGID子进程遗漏、stage-only ACK串线、单布尔误作全部 coverage、并发observer与cleanup竞态。原75/90/95预算、五方法、40poll、signal权限均保持，不借此加timeout或复用旧ACK。
