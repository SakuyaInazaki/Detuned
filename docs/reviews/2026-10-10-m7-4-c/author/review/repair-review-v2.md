# C v2：首 native 失败安全修复的独立差分复核

2026-10-10，仅静态读取/hash；没有 syntax、测试、guard、宿主运行。原 native-first-review.md 与首失败保留。

实际绑定：source `6015a755cf2323670ddd8352c93237ecf850739bfb656242c18a32f109860c99`；freeze-v2 `167ffb325b80cb3df7471d35b3ccdd65943a7011570c494f5a1cda93505d8110`；delta `cf4a01d3bc26df28d006e30dc7e32ed14c7083d5ca7fbc54ba0bd90ebc4bfcc7`。三个实际 SHA 均匹配。

## 修复闭合

- 正整数>1候选先加入 Set，再可信 mcp_spawned observer，随后才查 UID/PGID、要求等于原 workerPGID。mcp_registered 仅 confirmed observer 完成后为 true；ack 文件另有独立 acknowledged 状态。未确认候选不授予 signal 或负组 probe 权限。
- 生成 launcher 第一条运行语句设定共享75秒 workEnd 与 ackEnd，紧接 setTimeout，之后才 dynamic fs import、PID文件、ack等待及 MCP import。ack 前最多原3秒，ack后换共享 workEnd；不把曾经 totalEnd85秒错误用作业务期限。此为可信固定源码，不是下载执行。
- worker gate 区分真正截止与 cancelled，白名单允许 CANCELLED。supervisor work deadline 布尔仍表达75秒整体观测，RPC15秒局部超时仍可用 NATIVE_PROBE_DEADLINE，二者不应混为整体验收时间耗尽。
- finally 在确认组清退之外逐个 exact positive candidate kill(pid,0) 检查；仅 ESRCH 表示 absence。EPERM/EACCES/仍存在保持 false/unknown或present，最终failed，rootSafeToRemove也要求候选全部不存在。没有对 candidate 新增信号，没有把不同 PGID 纳入可清退组。
- 原错误优先、90秒总预算、actualclose、confirmed worker group 信任、policy/min env/普通 helpers未由本 delta放宽。没有发现本窄修可行动阻塞。

## 证据复用与必须复验

未变 policy 的实际独立 guard 与 worker_registered 后/bootstrap 前 reject 可复用其原始事实，但它们没有走 MCP 候选分支。必须由 root另放行的唯一 normal 复验观察真实 mcp_spawned→查询phase→samegroup确认/失败→候选实际absence；失败仍可作为兼容边界收口，不要求放宽策略或无限实验。任何 actualquery 不匹配都须failed，候选 unknown 则保root/registry，不能静审代替实测。

D最终capture ready尚待正式绑定联合审；本报告仅A v2差分结论，不预填 normal恢复成功。
