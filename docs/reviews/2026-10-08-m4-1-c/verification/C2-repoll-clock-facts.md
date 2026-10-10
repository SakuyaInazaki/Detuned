# 首全套 C2 failure 只读契约归因

实际首fullsuite554/555、74/75，本轮新13通过。旧tests/integration/m2-context-session-chain.test.ts:37比较pending结果与{...batch,has_more:true}；仅next_cursor exp从1791543212到1791543213、签名相应变化，batch/events/range不变。:9原buildApp({storage})不显式控制Clock。

协议docs/04-protocol.md:169承诺同batch_id与范围；:176明确“重投同一batch续签24小时，不改变批次范围或ack_seq；旧游标过期可重新poll取得该批新游标”。docs09:18 T08同批重投/游标单调，不承诺签名字符串固定。

已接受M3.1 README:3和verification/verification.md:21记录Clock整秒24h/过期repoll原batch新cursor。tests/integration/m3-event-core.test.ts:18 E05实际将seconds增86401、旧ack拒、samebatch/events、新exp=seconds+86400；不因C2fixture假设去修改或删除TTL覆盖。

当前EventService:163–168每次cursor以floor(clock.now()/1000)+86400签发；pending:175–185按持久batch/event_ids读取后重新调用cursor。固定Clock可成为C2全对象等式的明确测试控制前提，并说明不测试wall-second跨界；这不是修复产品重投或把签名字符串固定化。此记录仅只读，等待父授权处理测试。
