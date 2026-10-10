# M3.1 核心读取事实与最小接口草案

2026-10-06。已读AGENTS/README/docs00/08/11、docs03/04/07、C2 next-task；当前M2本机已接受，不外推M3。仅规划，产品/正式测试未改，before尚未运行；等verify fresh baseline完成。父决定下列兼容细节后实施。

## 精确所有权/现状

候选独占 `packages/core/src/services/event-service.ts`、新增 `tests/integration/m3-event-core.test.ts`、`docs/03-data-model.md`、`docs/12-decisions.md` ADR034、本目录及implementation/core。无需StoragePort/SQLite/SQL/DDL改动；ClockPort.now及TokenSignerPort.verify(token,secret,nowSeconds?)已足够。若新导出需core/index一行export，先请父批准，不自行扩展。

现 `packages/protocol/src/events.ts` PollRequestSchema：limit整数1..100/default20，wait_ms整数0..25000/default0；直接core poll对limit clamp，未处理wait_ms。`docs04:13`仅最长25秒上限，不规定必须等满。新增有效等待属本包明确能力合同。

`event-service.ts` poll当前先space访问/space/consumer/sub归属/epoch，再在Storage.transaction中重投或scan500、filter+limit100、持久batch与active/version；ack先访问/space/consumer/sub/epoch/token，再事务中核current epoch/batch。consumer在事务外读后闭包复用，SQLite `.immediate()`（sqlite-storage.ts:50）保证单写事务，但跨连接前读/后入事务需移到当前事务内重读，避免并发拿旧active/version。没有必要跨await保持任何transaction。subscribe相同过滤复用sub，consumer_key存在时保原ack位置，不能拿新checkpoint覆盖旧consumer；保此恢复语义。

新批和重投cursor仅consumer_id/batch_id/through_seq/exp，exp=floor(Date.now()/1000)+86400；重投重新24h。ack signer.verify未传nowSeconds，默认Date.now()/1000（非整秒）。旧signed cursor可真实绑定到persisted consumer→sub→actor/space，所以“缺actor/space字段”不能直接判可跨用户利用；实际归属check仍在。重复ack成功分支在persisted through_seq比较前，须before证明签名错误范围是否被接纳。visibility public/review_assignment存在，当前filter/重投没有visibility检查；产品目前未实现sealed review业务，before须明确测试存储私有事件而非声称真实新review HTTP。

## 唯一建议接口/等待方式（父待冻结）

保留 `poll(auth,spaceId,consumerId,req):PollResponseData` 同步即时行为供现调用/测试；新增 `pollWithWait(auth:AuthenticatedContext,spaceId:string,consumerId:string,req:PollRequest,options?:{signal?:AbortSignal}):Promise<PollResponseData>`。protocol新route await此方法并仅传transport取消signal。无新的共享DTO必需，PollRequest/Response沿用。

在event-service.ts导出最小 `EventWaitScheduler {nowMs():number; sleep(ms:number,signal?:AbortSignal):Promise<void>}`；constructor保持现6依赖顺序，末尾第7可选scheduler默认内置monotonic performance.now + Abort可取消timer。无bus/依赖/新Port。默认重检间隔50ms，sleep min(50,deadline-now)，测试可注入屏障scheduler精确控制截止/写入/撤权，不靠sleep猜竞态。wall Clock只用于业务TTL；等待deadline用scheduler单调时间，不把clock回拨变无限等待。

每次尝试poll在短同步事务内refreshContext→space read→consumer/sub/epoch→currentactive或scan/filter/固化；null batch且remaining>0才await。已有/重投/任何可推进空匹配batch立即返回；截止后做最后当前鉴权读取再返回null。Abort前/等待中/事务后均检查signal，抛AbortError（建议DOMException，route不把断连写成公共500）；已持久batch仍恢复，永不ack。sleep finally清timer/listener，等待期间无SQLite事务锁。

## 父需一次冻结的最少兼容点

1. 新cursor建议strict `{v:1,purpose:'event_ack',actor_id,space_id,consumer_id,batch_id,through_seq,exp}`；safe整数through_seq>=0，Clock floor秒验等号有效/+1失效，24h。重投新签24h（沿原行为而非内容分页不续期），旧过期cursor拒绝但poll可取得同batch新token，不丢数据。当前错误409 ACK_INVALID沿用。
2. 持久旧batch原cursor兼容：建议仅接受旧exact四键consumer/batch/through_seq/exp且仍须签名、currentClock、persisted batch实际范围/归属一致；新格式strict全绑定。若父决定拒旧格式，明确客户端须poll取同batch新cursor，保旧batch，无DB迁移。两种不得自行选。
3. 无已启用私有review读取机制，本包公共consumer仅投递visibility=public；review_assignment一律不投递，但扫描through_seq可推进。重投固定event_ids/currentvisibility投影，可因当前ACL少返回事件但不换batch/range，不泄封存内容。其它当前对象安全核应以现合法业务可见性为界，不凭未来模块发明权限。重复ack先严格真实范围/所有绑定再幂等成功，用当前事务consumer的seq/version。
4. same8tools/root schema等protocol方持有；wait输入非法shape继续同源validator，无新客户端响应validator。subscribe/deactivate若本包发现真实同类归属/refresh问题可在同服务必要修复，需先before说明，不扩其它services。

## 有限验证/实质before

基线后独占probe记录实际现有：注入Clock远离系统时间的有效/过期ACK；签名错误through_seq的重复ack；review_assignment stored事件混入首poll/同batch重投；跨consumer/actor/space真实token控制负例；poll wait_ms>0当前立即null的行为缺口。坏签名不冒充攻击者能签token，受信签名夹具专测服务绑定校验。记录DB消费者/批次/event/idem完整delta及fixture来源。不要把helper缺失当反例。

正式新专项覆盖：500干扰扫描/空匹配batch/100limit、strict/legacy绑定TTL与等号、重复/乱序ack、当前refresh撤权/epoch、两个连接并发同consumer只有一个batch、scheduler屏障wait0/default/唤醒/截止/Abort/空匹配即时/已batch即时，所有无自动ack及原事务回滚。真实HTTP/新进程重启/响应丢失由verify独立负责，共用取消链protocol负责。只跑本单元专项与必要sourcealias noEmit，冻结后父统一独验；不build/fullsuite/600秒。保留首失败，旧正式需修改先报精确区段。


父实施冻结补充：已批准上述pollWithWait/scheduler，同文件100ms周期、128实际等待槽；strict event_ack与精确旧4key并存、Clock floor24h重投续签、范围核先于重复成功、普通admin也仅public。无需index/Port/Storage扩展；实施及实际结果见implementation/core。
