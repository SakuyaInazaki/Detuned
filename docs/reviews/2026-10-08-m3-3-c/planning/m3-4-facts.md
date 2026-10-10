# M3.4 限额与运维事实（只读，一页）

依据 docs07 §5、docs08 M3.4；本页不改变C验收状态，不实现/实验。规范已给默认单actor写60/min、burst20；日志字段request_id/actor_id/space_id/operation/duration/code且不正文/token/附件；readiness查schema和目录，liveness不访问模型，graceful shutdown为路线要求。精确rate计费对象、补充存储数字与关闭时限尚须父冻结。

**已实现不得重列缺口。** protocol/artifacts.ts:36默认单文件25MiB/单空间1GiB，core ArtifactService在事务内检查空间bytes；server活upload默认4。SpaceExportService默认active4及wire/line/count/deadline上限，route preClose销毁流。EventService:226等待poll上限128、events route preClose取消pending。分页/response预算及搜索candidate/response cap已有；后者不是硬SQLiteVM执行时间预算。HTTP nativeheader限65536、Fastify默认JSONbody限制与schema validation存在，不能说完全无限请求；补明确单源策略/载荷字段与全局存储限制仍缺。

**共同写入口与缺口。** core IdempotencyService.executeIdempotent（idempotency-service.ts:2614）集中10family业务幂等write，在同步storage事务中判existing/replay→action→event/resultcommit，注入ClockPort；auth requireSpaceAccess/requireInstanceAdmin分开。admin actors/credentials/memberships、session创建和消费ack等并非都经该入口，不能只在一处挂rate就宣称所有写受限。现无默认actor60/min burst20机制。需冻结是否按actor跨credential/space计数，replay/失败/取消/管理/消费ack的计费范围与Retry-After；服务层统一规则，CLI复用错误契约。内存rate重启会重置、持久rate需显式选择，不无故把大量meter存metadata绕迁移。

服务尚无明确实例总DB/研究正文/总文件数存储quota，空间附件额度不防无限正文或大量小record；数字及额度回收/维护导入适用范围未冻结。若用持久资源计数需父选择既有SQL查询/受控新增schema迁移，不发明全局quota数字。AppOptions是服务组合根，CLI serve组合storage/blobs并读现参数；业务不直接process.env。maxrequest/timeouts也须对现JSON/上传/stream各路径区分，不能误截合法长poll/export。

**运维现状。** server/app.ts:95 logger:false；无结构化默认非敏感request日志或指标sink。无health/readiness/liveness route；CLI启动先持锁/协调schema/gate/blob目录，属于启动校验不等于可访问探针。CLI shutdown:347先app.close再db.close/release lock，SIGINT/SIGTERM幂等但吞错误并exit0，无明确有界drain/失败退出或signal listener cleanup契约；events/export已有取消hook应复用，上传/普通写和停止接收/完成事务需统一真实验证。

**最小两包候选。** A：业务write限流与服务request/storage配额、可显式注入的配置/时钟、429契约；core共同guard及各非幂等write入口，必要storage/protocol/server组合根与新formal（父冻结具体语义/数字/持久路线）。B：非敏感结构化日志/指标、readiness/liveness、统一有界shutdown；server组合/route、CLI进程资源退出、独立真实信号/断开/秘密探针与docs。不先铺通用框架。

默认rate会影响固定Clock/同actor短时间批量seed：m2-thread-posts-read.test.ts:23一次60帖子；搜索/分页目录批量写、M3事件批次/recovery、20client规模runner与重试fixture也需有界查。新scope formal应默认真实60/20检验，旧大seed可显式测试配置/推进clock（由父确定），不能默全局关rate或把旧fixture429当产品反例；本页未跑或改tests。完整M3.4仍不能由现局部caps/普通app.close声明已完成。
