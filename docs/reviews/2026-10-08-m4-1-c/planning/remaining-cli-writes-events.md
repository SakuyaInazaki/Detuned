# M4.1-D 剩余CLI写入/消费：只读事实（父待冻结）

仅查当前仓库，不实现/运行测试/读用户配置或凭据；C当前M4.1-C gate不受影响。

## 已有client方法（没有缺少的HTTP薄wrapper）

- createSpace(body:CreateSpaceRequest,requestKey?:string,opts?:WriteOptions)：POST /spaces，CreateSpaceRequestSchema（slug/objective/rules必填，policy/profiles可选），必Idempotency-Key，201 data={space:Space,revision:SpaceRevision}。instance admin授权。persistent space.create scope spaceId=null/target=null；core幂等space='instance'。
- patchSpace(spaceId,body:PatchSpaceRequest,requestKey?,WriteOptions?)：PATCH /spaces/:space_id，expected_revision必填，objective/rules/review_policy/check_profiles/pinned_refs可选；必key，200同{space,revision}。maintainer权限，persistent space.patch spaceId=space/target=space。
- patchThread(spaceId,threadId,body:PatchThreadRequest,requestKey?,WriteOptions?)：PATCH /spaces/:space_id/threads/:id，expected_version必填、title/state(open|archived)可选；必key，200 data=Thread。persistent thread.patch target=threadId。
- createSession(spaceId,body:any,opts?:{signal?})：POST /spaces/:space_id/sessions，实际CreateSessionRequestSchema/CreateSessionRequest（client_name/client_version必填，harness_session_id/metadata可选），201 data=SessionSchema/Session，无key。现wrapper参数和返回泛型any，不缺方法但typed契约未接。
- deactivateConsumer(spaceId,consumerId,opts?:{signal?})：DELETE /spaces/:space_id/consumers/:id，无body（validateNoBody），200 data={deactivated:true}，无key。现wrapper泛型any。
- subscribe(spaceId,body:CreateSubscriptionRequest,requestKey?:string,opts?:{signal?})：POST /spaces/:space_id/subscriptions，201 data={subscription:Subscription,consumer:Consumer}。body consumer_key非空≤64必填，thread_ids/event_types/start/checkpoint_token可选；无HTTP Idempotency-Key要求，传requestKey只是兼容header，core不读取它，不进入业务幂等表/RequestKeyStore。
- poll(spaceId,consumerId,query?:PollRequest,opts?:{signal?})：POST /spaces/:space_id/consumers/:id/poll，参数实际JSON body（不是URLquery），默认{}。PollRequestSchema limit整数1..100/default20，wait_ms整数0..25000/default0；200 PollResponseData={batch_id:string|null,events:Event[],next_cursor:string|null,has_more:boolean}。无key，不自动ACK。

位置client.ts:666–681/727/876–912；protocol spaces.ts:73–115、threads.ts:34–41、events.ts:47–112；server routes/spaces.ts/events.ts/threads.ts。现这些wrapper返回request的{data,meta?}（data多数any），新CLI需沿res.data输出，不能套用M4C七方法直接data形状。旧path拼接未encode这些ID，若改需明确窄scope而非重写所有client。

## 业务与安全retry：不能从POST/DELETE猜

SpaceService.createSession(202–223)每次生成新ses ID并插入，无IdempotencyService/唯一harness_session_id去重；**非幂等**。现client仍generic默认重试，下一包若接CLI需父决定像六admin固定singleattempt，不能假称当前安全重试。
EventService.subscribe(57–145)按actor+space及排序等价filters复用subscription，再按subscription+consumer_key复用consumer；已存在完整组合无mutation免meter，新增时一次计费。原start只影响新consumer的ack_seq，已存在consumer不重新定位。不需/不使用请求key；此复用与请求body通用幂等不同，不把同actor不同worker凑同consumer。
EventService.deactivateConsumer(276–287)源码明确不存在consumer return（“Idempotent”）；存在时校验sub.actor_id、meter再storage.delete。固定同ID成功删除后重复返回成功，client当前默认retry。poll固化单pendingbatch，响应丢失下次poll恢复同batch；ACK单独显式确认，原M3可靠消费规则不重复设计。

**两项下一包需核实/裁定的source缺口（未实验，不擅自改）**：
1. sqlite-storage.ts:1282–1284 deactivateConsumer直接DELETE consumers；schema.sql:183–185 delivery_batches.consumer_id FK无ON DELETE CASCADE。已有delivery batch（pending或acked）引用时删除应触FK失败；不能未经验证声称可停用任何真实使用过的consumer。下一包若要求完整生命周期需有限真实反例/父决定cleanup策略，可能必须窄core/storage修复而非仅CLI。
2. EventService.deactivateConsumer要求传入space访问，但sub校验只actor_id，未比较sub.space_id===spaceId；同actor持限space凭据给另一space consumer ID存在跨space停用风险（无batch时更直接）。父需决定下一包必要窄授权修复，CLI不能代替server判断。

## checkpoint/start当前实际规则

CreateSubscriptionRequestSchema只是两个optional字段，**没有oneOf/互斥/条件必填**。core实际：start='now'取latest；start='context_checkpoint'且checkpoint_token truthy才验checkpoint签名purpose/actor/space/seq范围；其余走beginning 0。因此context_checkpoint缺token当前落beginning，token配beginning/now或start省略当前忽略token，不能说已有严格互斥规则。
协议docs04§5要求选context_checkpoint以checkpoint起步，旧CLI start默认beginning、没有checkpoint-token flag。目前CLI即选context_checkpoint也无法提交token。下一包要接flag必须父明确省略start时checkpoint映射/显式冲突策略，若强化业务规则需server/core单源，不能CLI独自定义合法性或偷偷复制token验证。
thread_ids/event_types数组schema可选，core按排序filters匹配subscription；event_types用EventTypeSchema固定枚举（包括未启用M6事件名不代表业务已启用）。thread_ids过滤thread/post/relation空间对象，非这些family在thread filter下排除；不为参数接线重设计过滤/历史。

## 现CLI兼容与wait预算

CLI index.ts:764–824：subscribe有--space/--consumer-key/--start(defaultbeginning)/--request-key，只传consumer_key/start，成功res.data。未接thread/event filters或checkpoint。poll有--space/--consumer-id/--limit(default20)用parseInt（会接受'1junk'），未接wait_ms，成功res.data。ACK现--batch-id/--next-cursor输出res.data保留。callTool forum_subscribe/forum_poll已传完整filters/checkpoint/wait，不能因CLI缺旗帜说HTTP/client没有这些字段。
space group已space list/read，thread group已list/posts（index.ts:538/574），不能再创建同名顶层group覆盖旧读取；当前无spacecreate/patch、threadpatch、sessioncreate、consumerdeactivate CLI。JSON输入现readInputJson同步file或'-' stdin；M4C readAdminInput局部安全object错误可评估窄复用，旧publish/relate输出/输入不更动。
client默认timeoutMs=30000是**每attempt**预算，poll合法wait最高25000留约5秒网络/body余量，不保证慢网络也够；opts仅signal没有percalltimeout覆盖，CLI getClient也无全局timeoutflag。poll请求可能原boundedretry，整个命令总时长不等于25秒或30秒；用户自建client timeout<wait可能得到TimeoutError。core monotonic wait最多25秒/128wait槽、周期100ms、取消不ACK/无长事务已实现；不提高等待上限或把CPU同步当可硬抢占。

## 明确另包

全局稳定JSON/parser错误/exit框架、显式--token-file（现在只有token/env/DETUNED_TOKEN_FILE fallback）、用户凭据配置策略独立后包。父需先冻结命令语法/整数解析/输入与输出兼容、session singleattempt与consumer修复最小owner；本页不预选实现路线，不提前宣称M4完整。

## 父要求的consumer生命周期补充（只读）

1. **字段**：protocol/events.ts ConsumerSchema/Consumer及schema.sql consumers只有id/subscription_id/consumer_key/ack_seq/version/active_batch_id/acl_epoch，无active或deactivated_at。DeliveryBatchRecord（core/ports/storage.ts:37–45）与delivery_batches只有id/consumer_id/from_seq/through_seq/event_ids/acked_at/created_at；acked_at是确认时间，不是停用状态。StoragePort.deactivateConsumer(id):void，没有soft-active或停用结果字段。
2. **引用/保留**：schema.sql中指向consumer的唯一数据库FK是delivery_batches.consumer_id REFERENCES consumers(id)，无cascade；consumers(subscription_id,consumer_key)唯一，consumer自身指subscription。active_batch_id只是TEXT，无指batch的FK；events/idempotency等无consumer FK。schema也没有delivery_batches.consumer_id索引。docs03表格及M3.1段要求持久未确认范围，docs04§5要求pending重投与同batch重复ACK；没有“停用后仍永久保留每个历史batch”的明确规范，也没有当前停用后清理批次的契约。backup/upgrade保业务历史是维护行为的范围，不应擅自移用为用户明确停用必须永久保存的规则。删batch会让旧cursor不能再ACK/重投，必须父明确停用终止语义与原目录备份区别，不能自动断言违反或不违反保留要求。
3. **事务/顺序**：EventService.deactivateConsumer当前无storage.transaction外层，顺序requireSpaceAccess→findConsumer（无则return）→findSubscription/actor check→writeRateLimiter.admit→storage.deactivateConsumer→单SQL DELETE；没有appendEvent，也无业务幂等记录。meter process bucket先扣，FK失败后不会退额（既有admission失败不退规则）；不能称它当前有“meter/事件/删除同事务”。
4. **相邻检查复用**：private currentConsumer（event-service.ts:147–165）先refreshContext→requireSpaceAccess当前space→findConsumer缺则404→findSubscription，要求sub.actor_id===current.actor.id且sub.space_id===spaceId，否则403→consumer.acl_epoch匹配当前space否则409 RESYNC_REQUIRED。poll/ack在短事务用它，ACK再验batch.consumer_id/through/active_batch；subscribe只创建当前actor/current space组合。它的space+actor检查可供父选择复用，但其404与epoch拒和停用“不存在成功/允许清理旧epoch consumer”的潜在语义不同，不能整段直接套用而偷偷改变停用行为。
5. **checkpoint文档/依赖**：docs04§5(1–2)只有beginning/now/context_checkpoint选择、签名绑定与24h，不明确missing token或token配错start必须400；schema没有条件约束，core目前非法签名/范围是422，不是400。已窄检现tests下包含context_checkpoint的用例：m0-m1-r2-regression S04伪造seq与S05跨actor都带token，m2-context有效/过期与session-chain也带token，m3-backup-recovery-independent恢复secret失效也带token；未找到明确依赖“context_checkpoint无token成功beginning”或“token配now被忽略”的断言。这不是对全部旧review/probe/外部调用者的兼容性保证；本次不扫描/修改历史材料，也不实施新start校验。
