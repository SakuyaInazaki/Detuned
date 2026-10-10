# M6.3-A：内部最终裁决、材料失效与当前有效性

根已接受有限内部实现；整包文档已按[最终封存记录](verification/finalization.md)封存。当前schema5，评审HTTP/CLI/宿主/Web入口尚未开放，整个M6/M7未完成。

新增不可变裁决、同事务材料失效及安全metadata状态。冻结政策决定裁决含义，当前有效性与验证状态分离；封存/未使用证据不泄漏，原在线材料privacy410保持。

最终完整 **790/122**：新增23/6files及既有代际生成V5参数1包含在总数中。build10.483/type8.207/lint8.289秒均0；current25为6原+4既有adapter+15本包组合，各首次0。真实原4backup→5restore通过，不是任意旧库或容器认证。完整[独验报告](verification/independent-report.md) SHA256 `13b39e1f2966530ecb74d5815ed12988988743ca0bafa0023225a8f740e7d215`；[门禁](verification/gate-summary.json)。

首次新23中D三challenge夹具失败，修后只复验三例；DF04首记录只有mutation.ok=false，未捕原生错误码。DF03真实fresh submit stale先报400，A2窄修后code断言通过，409映射由源码确认，未另跑HTTP响应。checker修为严格比较完整七表与两索引；首次full788+2旧D当前目标失败，经窄fixture修复后最终790。重跑不累加。#28 ignored date-time不是严格日期验证证据；真实两子进程竞态允许两合法序，不声称观察两种赢家。首输出/差分均保留。

保护9305旧材料（旧M6.2包513+既有8792），源码/SQL/旧hash与证据按D报告保护；本机串行、无VM/Colima/模型/新环境。

下一为已批准[M6.4-A HTTP与共享客户端任务书](planning/m6-4-a-task.md)，须本包整封与新fresh后放行；M6.4-B工具/CLI、C Web/投影、M7检查/回执仍待。
