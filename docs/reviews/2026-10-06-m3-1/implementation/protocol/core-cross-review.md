# M3.1 核心只读交叉审查

2026-10-06。审查冻结event-service.ts、相关现有AuthService/TokenSigner/SQLite事务实现及新增m3-event-core.test.ts；未改core/旧证据，未运行测试或build。不替代独立运行。

结论：在父冻结的wait/poll/ack范围内未发现需修复的具体反例。

- event-service.ts:165–211：每次同步poll以Storage.transaction进入，167→141–154重新refresh当前actor/credential，requireSpaceAccess、consumer/sub真实归属及space epoch，随后读active或扫描并持久batch/active/version。现SQLite transaction回调使用同一storage实例（sqlite-storage.ts:50起），这里currentConsumer通过this.storage读取仍处于该事务。无await跨事务。
- 214–243：进入前/初poll后检查signal；完全无batch且wait>0才占槽，223已完成当前鉴权的真实即时读取，128槽超额429，不限制即时返回。每次await后238检查取消，再239重新调用上述短事务；deadline分支233及末轮239仍重新核当前权限，不能直接返回等待开始时缓存的空结果。finally释放槽。100ms或剩余deadline较短者决定sleep，单调scheduler与业务Clock分开。
- 28–39：默认sleep abort与timer正常结束均清timer/abort listener；预取消在设timer前拒绝。214前置取消无DB访问；事务后224/240取消不会自动ack，已持久批次保留。core tests E07/E08/E09/E10分别覆盖无持有事务/唤醒、wake撤credential、128槽取消、持久后取消。
- 157–162、246–266：签发与验期都是floor注入Clock秒，签发24h；每次重投重新签发不换batch。ack先当前权限/归属/epoch，再验签，253–257精确旧四key或新八key，新v/purpose/actor/space绑定，through_seq和exp safeinteger。259–260真实batch归属/范围和空间高水位先于261重复成功；既往acked且当前ack_seq>=through只返回，不降低序号。当前active和非倒退再检查后，acked/seq/version同事务写。E02–E05分别有Clock等号/+1、重复ack假through、wrongscope/extra/newv与合法旧shape、过期重投/旧ack不降位置。
- 175–178重投固定IDs只保current public且same-space；181–210扫描500、当前过滤/limit、空匹配batch同事务推进扫描但不ack。E01/E06/E11专测private投影、500干扰/100返回、空匹配即时；projection不包含正文。

覆盖界限：作者E11的Promise.all由于每次同步事务先执行，不等同两个真实进程/两SQLite连接争用；不能借该名称宣称跨进程实测。实际重启/响应丢失/双连接及HTTP权限负例由独验运行。作者E08直接测credential撤销与epoch，actor禁用、membership/read能力变化的更多真实入口由独验验证；代码路径均经AuthService.refreshContext:78–85及requireSpaceAccess。subscribe/deactivate为原即时路径，本审查未将其扩为新异步业务或整阶段M3验收。
