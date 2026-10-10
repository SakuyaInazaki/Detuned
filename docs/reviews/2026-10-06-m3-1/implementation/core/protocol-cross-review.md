# M3.1 core → protocol只读交叉审查

2026-10-06；产品与新contracts已冻结后只读，无新增测试/build/loopback执行。依据protocol freeze-manifest与实际source，审查限events route、MCP index及新7项contracts，不代替统一独验。

- `packages/server/src/routes/events.ts:19–22` preClose先标closing并abort本插件activePolls，`57`新poll拒绝retryable503；`63`只调用core pollWithWait，权限/过滤/batch判断仍在core。现有待确认/立即结果不人为追加等待，subscribe/ack合法输出保持。
- `events.ts:49–61`每poll独立controller；只监听IncomingMessage aborted与ServerResponse close，close在writableFinished=true时不取消，不监听正常request body end/close。故完整请求正文后等待不会被误当断连；正常响应完成也不触发Abort。取消只影响尚未完成异步尝试，不自动ack。
- `events.ts:65–76`断连后hijack无公共500，仍连接的preClose取消映射503；其它真实业务异常原样传播；finally精确removeListener并从active集合删除。若同步core已持久batch而网络取消，则保持持久结果、下一poll重投，不回滚/隐藏确认；E06用真实原core执行后屏障截断交付证明这一边界。
- `packages/mcp/src/index.ts:58–61`官方SDK extra.signal传既有callTool options→client HTTP控制；八工具发现沿原目录，不增加业务规则。成功/错误结构保持。SDK取消不调用ack，stderr诊断与stdout协议分离。

新 `tests/contracts/m3-events-contract.test.ts` 实际有限覆盖：E01真实SQLite/inject无新增wait截止+consumer不变；E02defaults及非法shape未到业务；E03真实loopback正常request body完成不cancel、外部abort断连+route监听器去除；E04 client短timeout取消（maxRetries0）；E05 app.close→mock等待signal取消→503；E06真实batch持久后交付屏障取消→同batch重投且显式ack才推进；E07官方SDK→真实MCP源码stdio→HTTP观察断连、ack计数0、still8tools。E03不等于全量成功响应body流矩阵，E05mock服务不等于core默认timer内部资源证明；完整恢复/并发/WAL/真实默认等待及installed Pi由独验和core专项补充。作者7/7/noEmit0记录已读，不称我重跑。

本范围未发现能落到具体触发/差异的新增产品缺陷。close监听器的writableFinished保护、finally收束和已持久batch取消后恢复与冻结合同一致。未审无关旧路由/未来review，不声称真实宿主/模型认证或整个M3出口。
