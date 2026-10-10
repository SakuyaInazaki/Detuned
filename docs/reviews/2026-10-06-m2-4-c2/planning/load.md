# C.2 单元B：负载参数冻结 v1

2026-10-06。父于2026-10-06批准主体参数并冻结v1；唯一调整为单主空间。现允许实现与manifest对齐后的10秒/20client烟测，正式600秒尚未授权执行；本文件不是已运行结果。本单元仅负责新增 `scripts/scale/run.mjs`、run-前缀辅助、`scripts/scale/README.md` 和本包 implementation/load。现未实现runner、未build/test、未生成或运行负载。依据前包[next-task](../../2026-10-06-m2-4-c1/next-task.md)、[docs09 T06/§4](../../../09-validation.md)、[docs01 §6](../../../01-product-requirements.md)。产品、旧正式测试与历史证据不改。

## 建议一次冻结参数

| 项目 | 建议精确值 |
|---|---|
| 身份 | 20独立actor，各1session、1consumer、1独占可写thread/可修订post；共享读取权限仅运行空间 |
| 空间 | 1个主空间初始100k帖子/1M事件，20client均成员，所有性能读/写/消费仅主空间；ACL负例空间由verify在性能窗口外独立创建验证 |
| 时间 | 30秒独立warmup；完成warmup drain后重新取各client空间checkpoint/建立正式consumer；固定测量600秒；最后停止新意图，30秒有界在途收束，再独立catch-up最多120秒。三个阶段日志隔离，收束不延长测量600秒 |
| 调度 | 每client目标2逻辑操作/秒，总40/秒；每client最多1在途逻辑链，全局最多20；单调时钟500ms固定tick，client相位i×25ms；忙时跳过tick不积压/不补发，报告missed ticks与实际速率。不是无界最大吞吐声明 |
| 六类 | 每client100意图确定性洗牌块：context20/read20/search20/create10/revision10/poll20；固定PRNG种子 `detuned-c2-load-v1` 加client编号；跨完整块精确比例，尾块报告偏差 |
| 连接 | 一个独立server子进程/一个runner进程；Node内置fetch HTTP/1.1 keepalive，20独立client对象；不安装Agent库、不自称20独立socket。全局20在途限制是可观测请求上限，记录实际连接数如平台可观测 |
| deadline/retry | 每请求timeout5000ms，逻辑链deadline20000ms；DetunedClient maxRetries=0，runner显式最多1次有界重试：网络/timeout/429/502/503/504及服务器retryable。delay250ms；Retry-After<=2000ms遵循，超过不重试。400/401/403/404/409/413/422不自动重试。deadline及测量结束Signal取消不ack |
| poll | limit100、wait_ms=0；当前EventService.poll未使用wait_ms，不把它假称真实longpoll。正式样本无longpoll等待；未来等待测试另立，不混普通p95 |
| 预算 | context/目录/固定内容依client该类意图序号轮换4096、12288、65536；每cursor链budget固定，目录limit50；search limit20（接口没有max_bytes，不伪加） |

性能样本为目标100k帖子/1M事件隔离数据集上指定40意图/秒、20身份闭环争用；机器差异按实际报告，不冒称2CPU/4GiB认证。warmup统一30秒，writes也进入warmup单独账本，正式开始指纹/计数重新捕获。

## 子权重与链

- context：50%空间、50%focus；focus从manifest主空间合法open/archived候选池按固定轮转（open80%/archived20%）。无自动摘要，规则/checkpoint仍空间级。所有成功真实HTTP compact envelope字节核cap。
- read：目录50%、固定帖子35%、固定规则15%。目录最多3页或cursor null先到即停；明确这是prefix非全集。目录第一项post id/current_revision入该client固定ref缓存；post读优先缓存50%、manifest固定ref50%，完整续读至complete，最多64页/20秒；规则完整续读最多64页/20秒。64页或deadline先到为明确chain_incomplete失败，不能重组部分假称成功。manifest正常长文/规则最大编码128KiB，给4K保留预算余量；超大必需metadata422专由独验，不在常规性能样本里人为计成功。
- search：60%中文短词（1字/2字/3字各1/3，manifest提供命中/无命中池）、40%英文literal；各池80%命中20%无命中。50%不thread filter/50%限定合法thread；每链最多2页或cursor null，记录prefix而非全部结果。短词p95独立输出，错误限额不归零结果。
- create：client独占thread，80%note、20%严格合法failure（完整conditions/evidence/retry_when等按现schema与core提供配方）；UTF8 compact请求目标1KiB:80%、8KiB:20%，实际bytes记录。标题/正文包含固定中文/emoji/转义，禁止内容执行。
- revision：只修订client自有manifest专用note；expected_revision来自本client最后成功revision，串行无跨client竞争；90%正常更新，10%显式过时revision（expected_revision=当前-1；初始化revision>=2），预期409单列。revision body目标1/8KiB按80/20；固定旧ref从不被新revision覆盖。
- poll：只对本client正式consumer，完整poll成功且batch_id和next_cursor均非null后原值ack，即使events=[]（过滤扫描批次也合法）；无batch不伪造ack。每逻辑poll含0或1ack；重试同batch/tokens，不生成新cursor。全部正式consumer无thread/event_types过滤，便于独立零已确认丢失账本；focus消费filter正确性由独验另测。

不为了比例制造HTTP/ack；意图、完成逻辑、分页HTTP、重试attempt与条件ack分别统计。create/revision/subscribe使用每run/client/意图唯一幂等key，重试逐字同key/body；5%成功create/revision意图追加同key/body一次重放核id/revision一致，额外请求作为replay attempt，不增加逻辑意图或业务写数。预定409不换key修补为成功。request-id固定run/client/operation/attempt短标识，由记录真实返回request_id对照。

## Seed manifest最小依赖（请core/父确认）

公开manifest不含token/secret。版本/seed/配方sha、DB逻辑与文件指纹、隔离副本路径约定；主空间id与space initial highwater/ACL epoch/规则固定ref及compact文档hash+bytes；每空间合法open/archived读thread池及对应目录规模；固定post refs与五字段compact文档hash+bytes、其中中文/双转义长文和旧修订；中文1/2/3字和英文literal查询池（标注命中/无命中、filter可选，避免查询真变更误当固定总数）；20独立actor ids、20写thread、20专用note id/current_revision>=2、合法failure生成模板及可读evidence refs。

运行时私有配置通过权限0600自有temp文件或父进程管道供token/secret，不写公开manifest/JSONL/命令行；session复用core为20actor生成的独立session；consumer绝不预插，从context_checkpoint真实subscribe返回。core生成后提供精确counts、各空间public事件类型分布/visibility及oracle查询配方。独验只读冻结后最终DB与runner独立账本核实业务结果，runner不把自检称独立验收。若20专用修订目标尚未纳入core配方，先父统一参数，不自动扩大seed。

## checkpoint、写入与独立消费账本

warmup消费独立consumer_key；正式每client在首写前取空间context，保存原checkpoint token到私有可审计临时账本，公开保存token SHA256、checkpoint payload的space/actor/seq（只解码观察，不冒称客户端验证签名；现context没有独立last_event_seq字段）。subscribe start=context_checkpoint、consumer_key=`<run>-measure-<client>`，记录返回consumer.id/ack_seq与token seq相符。不能用runner读取DB替代HTTP初始化，也不能以focus checkpoint变成线程消费者。

每poll attempt账本含client/consumer/batch、event id/seq/type/object/revision、has_more、next_cursor hash；私有原cursor只保运行恢复所需，公开不泄secret。每ack请求绑定先前实际投递batch与原cursor，响应confirmed与acknowledged_batch_id核对；记录重复投递与响应丢失重试。写意图含request_key、payload hash、返回object/revision、attempts；正文/凭据不落请求日志。供独验关联最终idempotency/events，确认一个key至多一次业务对象/事件，不把request count当业务count。

测量与收束结束后server停接受外部新写（runner停止而非杀进程）；独验只读最终空间highwater H作为catch-up目标。runner对每consumer连续poll/ack limit100 wait0至无batch/has_more=false，保存最终consumer ack_seq；所有checkpoint起点之后<=H的应见public事件由独验DB oracle与每client所有已确认event集合对照。public/受限投影按现服务实际可见性核，不能假定seed1M事件全都应投递。catch-up额外时间/请求独立于600秒性能。达到deadline仍未追齐为失败，日志保留不重启伪零丢失。

## 可审计指标与停止

monotonic performance.now测HTTP attempt从fetch开始到完整body读取，逻辑从意图开始至链/ack/replay结束；fetch包装拦截状态/endpoint/真实raw UTF8响应bytes/requestbytes，不绕业务client。JSONL流式写append backpressure，记录phase/client/op/attempt/timestamps/latency/status/error/request_id/budget/page/cursor-hash；不写Authorization、token、secret。精确样本离线排序输出nearest-rank p50/p95/p99，总体普通HTTP/endpoint/逻辑/中文短词分别统计；warmup/catch-up/取消/预定409/预定422独立。未知错误原样code归类，不误报0。

每1秒采样server/runner RSS、CPU、DB/WAL/SHM字节与自有运行目录体积，记录OS/CPU/内存/磁盘/Node/pnpm/SQLite/依赖版本及背景负载可观测范围。当前只读Node=v26.3.0，不假称Node22环境。内部SQLite锁等待无现成instrumentation：仅报告实际SQLITE_BUSY/LOCKED错误和外部重试次数，内部等待记not_observed，不能填0；禁止为测量动产品。

SIGINT/SIGTERM或越权/预算越界/幂等重复/ack不对应已投递batch等语义不变量失败立即停止新意图，Abort在途后不自动ack，flush日志、保存错误与运行副本；常规性能错误计数保留，错误率>5%连续10秒停止为提前失败，不能说10分钟通过。正常到600秒停止新意图，经有界收束/catch-up后输出actualduration/目标与实际权重/missed ticks/错误分母/峰值/指纹与阶段计数。runner只能结束自己启动的serverPID；失败不删除DB。默认完全不自动清理；成功后也仅说明自有tmp/secret位置，由父最后处置，不能删用户DB/依赖/dist/历史证据。

## 路径依据与待父冻结事项

`packages/client/src/client.ts`现getContext/getThreadPosts/getSpaceRevision/getPostRevisionContent/search/createPost/createPostRevision/subscribe/poll/ack均可复用，client构造允许maxRetries/timeoutMs；默认retry3需要本runner显式0以可审计。`packages/protocol/src/events.ts` Poll limit1..100、wait0..25000，Ack必须batch_id/next_cursor。`packages/core/src/services/event-service.ts:115–260` poll同步当前忽略wait_ms；有batch空events可能是过滤推进，不能只按events.length决定ack。`packages/server/src/routes/events.ts`标准HTTP返回完整envelope。新runner无需修改上述文件。

父已冻结上述单主空间、速率、时长、子比例、链上限、retry/replay、wait0及停止阈值。新增磁盘free<6GiB或运行文件>8GiB停止；只每秒直接stat DB/WAL/SHM和日志文件，不递归du。20loadclient只有各自普通read/write凭据；管理员仅独验私密controller，不发loadclient。archive无secret，真实HTTP前临时secret/credentials注入明确标fixture初始化。完整T06与最终独验不由作者自评替代。

父补充已吸收：seed不预插consumer；已有consumer不会重新应用checkpoint，所以正式key与warmupkey隔离。verify freshbaseline为138source/36docs/5mutable/2915旧证据、4SQL/2schema、dist208+48；本草案不覆盖baseline。core1000threads/100kposts/约898k历史修订构成1M事件方案与单主空间manifest对齐，不能把fixture批量写入称HTTP负载。

## 实现账本v1字段

run-config.jsonl：run_id/mode/manifest_sha256/space_id/clients/时长速率/seed/server_pid/node/比例；requests.jsonl：phase/client/logical_op/op_id/attempt/method/endpoint/request_id_sent及返回request_id/start_ms/end_ms/latency_ms/request_bytes/response_bytes/status/code/classification/expected_status/replay/query_category；operations.jsonl：phase/finish_phase/client/op_id/logical_op/start/end/latency/outcome/code/attempts与window_start/end；consumer-ledger.jsonl：初始化actor/session/consumer/key/checkpoint hash+decodedseq/真实初ackseq/context及subscribe requestid，投递batch/from/through/event id+seq+type+object+revision/redelivery/cursorhash，实际ack confirmed/requestid，terminal ackseq/目标H及来源；write-ledger.jsonl：key/payloadhash/expected_revision/ref/resulthash/replay/预定409；resources.jsonl：phase/t_ms/serverPID+RSS+CPU/runnerPID+RSS/free/各文件bytes。Ack现响应仅confirmed和acknowledged_batch_id，不造expected_version/returned_ack_seq；公开through_seq来自实际cursorpayload、最终DB oracle另验。
