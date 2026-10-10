# C native 首失败：独立只读复核

2026-10-10。仅读取实际 source/producer/capture/receipt；没有执行、修改实现或认证 native。

绑定 source `007b5c0f7b660b6e2520d435c8af2a73fc1325bba78c1a35b50ff7ad7980b692`。证据为 verification/native-first.receipt.json、codex-native-first-result.json 及其 .capture.json。实际 exit1，1.014645375s；initialize/thread/start 已收到响应，catalogue/matrix 未完成。

## 可行动事实

1. `scripts/integrations/codex-check-probe.mjs:129` 在 queryOwnedProcess/PGID 相等断言和可信 observer 之前赋值 mcpPID；148 行仅用该变量存在投影 mcp_registered。因此 producer 的 true 是候选存在，不是确认注册。capture 仅到 native_registered，与确认 MCP 未完成一致。最窄修正应区分 candidate 与 confirmed，不把变量提前赋值当认证。
2. 129 行相等断言可产生实际 supervisor ERR_ASSERTION，但当前安全投影没有实际候选 PGID，不能仅凭它确定不同组的具体来源或存活状态。141/145 行只清退/探测已确认 workerPGID；候选没有经过 observer，所以 capture registry 也没有该候选。当前 worker_group_closed=true/registered_groups_absent=true 只证明已登记组，不证明任何不同组候选不存在。不得凭不完整登记扩大 group signal 权限。
3. 41 行 gate 将 cancelled 与真正截止均记 NATIVE_PROBE_DEADLINE；82 行 RPC 无 response 也用同码，含 native 提前关闭。实际总耗时约1秒，supervisor deadline_exceeded=false。因此不能把 worker 此码解释为15秒RPC或75秒全程预算耗尽。ownership 失败后发 abort 可走 cancelled 同码，但具体因果需后续最小安全诊断，当前不猜测为已证根因。

## 收口条件

保留本次失败，不宣称 MCP 工具发现/调用、四宿主或模型会话成功。root 若准最窄修，应要求确认注册事实准确；安全记录候选正 PID、查询是否完成/组是否一致，不泄露原始输出；对未确认或不同组资源保持 unknown，不将已登记组的清退证据外推。未获授权不重跑、不改变策略/权限/超时。
