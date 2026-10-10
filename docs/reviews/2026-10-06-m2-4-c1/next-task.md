# 下一任务：M2.4-C.2 规模与完整上下文链路验收

2026-10-06。父已接受C.1主题聚焦上下文与H-R1新真实历史兼容有限本机范围，最终正式333/333、35唯一文件与current29全过。H-R1已建立带真实旧版本来源记录的持久兼容样本并通过独立复验，后续普通回归直接使用归档。**本任务书的范围与实验设计已由父审阅批准，仍未启动本轮规模测试；本文件不是本轮实施、生成巨量数据或启动10分钟测试的许可。** 不改现规范/源码/正式tests/旧报告，开工另由父分派。

## 依据与可复用事实

[docs09 T06](../../09-validation.md)要求10万帖子、摘要来源更新、小max_bytes下实际编码预算/清晰truncated/继续读取路径/规则ref/checkpoint无竞态漏事件。该文第4段要求10万含中文帖子、100万事件、20模拟客户端、固定10分钟混合负载、比例/大小/速率公开及p50/p95/p99/错误率/锁重试/RSS/磁盘，longpoll等待不混普通p95；普通进程kill与备份恢复、断电耐受须分开，不能互相外推。[docs01 §5–6](../../01-product-requirements.md)给出目标2CPU/4GiB/本地SSD/单服务，普通无附件p95<500ms、短词搜索p95<1s，均为待实测目标；摘要固定来源更新、空间context默认12KiB/最大64KiB及正文独立读取继续沿当前合同。

本任务书只读rg了scripts/tests/packages及排除node_modules/dist/.git的仓库文件名中的benchmark/bench/seed/load-test/stress/performance，未发现现成规模生成器或10分钟混合压测runner；不把小型正式fixture当规模验收已存在。现scripts/history-fixtures/generate-b8dacd5.mjs可借鉴“固定配方/来源/指纹、隔离目录、拒覆盖、凭据清理”模式，但它专为历史旧HTTP归档，不能直接当当前100k数据集种子或为C.2修改其冻结内容。

现可复用正确性事实与接口：tests/integration/m2-context-focus.test.ts、m2-context.test.ts及其contracts覆盖空间/聚焦同snapshot与完整预算；m2-thread-posts-read.test.ts与contracts覆盖有界目录metadata/ref；m2-post-revision-read.test.ts、m2-space-revision-read.test.ts及contracts覆盖固定stored内容续读/当前ACL/TTL；m2-search.test.ts及contracts覆盖中文/签名分页；EventService既有subscribe/poll/ack与讨论正式测试可作消费语义依据。C.1 verification自有focus HTTP/WAL/tools探针与history-independent-review.md可借鉴隔离/全库指纹/真实链路取证，不能把过去小数据性能外推为本包结果。复用具体脚本先只读定位并由父划所有权，不改不可变旧证据。

## 数据与实验开工门槛

父编排、gpt-6.1-sol子Agent执行，先划生成器/负载runner与指标记录、独立正确性和环境验收三单元所有权，动态捕fresh保护基线（含完整C.1/H-R1所有新证据），不沿用2677或任何旧总数。可变状态索引/build输出单列；旧SQL/schema/archive/fixture/evidence原字节保留。无用户手工转交要求。

下一包先冻结可重复数据配方：初始至少10万Post、100万Event，含中文/英文/emoji、合法failure与summary、跨thread固定source/ref、多thread干扰，以及正文/规则长短与版本分布。冻结PRNG seed、来源生成方法/版本、各类比例/字节分布、actor/thread/space分布、日期与ID策略、event类型/public可见性分布、关联/修订逻辑、写入来源（真实HTTP还是明确fixture批量seed）与完整性oracle；不得把直接seed假称全数HTTP成功。生成后精确核行数/空间seq/ref/revision/typed字段/FTS一致性及fingerprint，负载写入造成的后续计数另记。

数据仅自建隔离实例和目录，不动用户DB/凭据/附件或全局配置。持久保存生成配方、seed/出处、文件与数据逻辑指纹、重建命令和指标原始记录；巨量运行DB可在自有临时副本并由配方重建，不要求凭据或巨量DB提交仓库。不可重复或机器资源不足如实记录，不用现schema冒历史，不安装依赖/模型/容器或擅换机器。

先跑小规模烟测及正确性门槛，确保预算、授权/所有权、幂等、消费确认等不变量，再冻结完整负载参数后跑规模实验。烟测规模/时间只是预检，不能替代目标数据量与固定10分钟正式样本；执行规模/时间/速率等具体参数在planning交父确认后才运行，不预填通过或工期。

## 父已选定的10分钟负载

固定10分钟，20模拟客户端并发；每client独立actor、session、consumer和自己的写目标/幂等key空间，明确跨client读取权限与冲突测试范围，不能复用同actor多session凑20身份。20client全部初始化有可核验space checkpoint，结束做最后catch-up核对；认证数据只在隔离运行环境，不入持久公开产物。

逻辑操作目标权重冻结如下，目录与固定内容读取分配的具体子权重、聚焦/空间context比例、短词/其它搜索比例、分页链长度、请求预算、节流速率、连接设置、warmup是否另计、deadline/retry/取消/longpoll wait参数在执行前统一冻结：

| 逻辑操作 | 目标权重 | 核实边界 |
|---|---:|---|
| context | 20% | 空间与focus，实际compact cap与空间checkpoint |
| 有界目录/固定正文读取 | 20% | 目录ref→固定space/post修订，真实cursor/分片链 |
| search | 20% | 中文短词与其它字面查询，分页/明确限额错误 |
| create | 10% | 独立client写所有权/真实合法typed payload与幂等key |
| revision | 10% | 当前或预定冲突revision，不漂移旧ref |
| poll→有batch则ack | 20% | 只确认实际投递batch，空poll不伪造ack |

权重是逻辑操作意图，不等于实际HTTP请求数：分页、retry、poll空批次和ack条件都会改变请求比例。必须记录目标与实际逻辑比例、每endpoint实际请求数/响应数/bytes、请求大小分布与每client实际速率；不得为了凑20%制造ack或确认未投递batch。20clients与固定10分钟执行遵守冻结参数，意外失败/预算耗尽原日志保留；改变配比、预算、速率、环境或seed须由父确认并另版本/名称，不能改负载后沿原名字宣称通过。

## 完整上下文链与正确性优先

负载前后分别独立验证一条完整链：新会话只凭论坛HTTP/client/tool获取空间规则ref与context/checkpoint→聚焦metadata与候选→检索已发布反例/失败条件→有界目录给post_id/current_revision→固定stored正文续读→摘要source来源更新状态→回读旧fixed refs仍不漂移→从space checkpoint poll并仅实际batch ack→最后catch-up。模拟新会话的可见输入只能论坛读取结果，不能读seed oracle/DB答案；独立oracle随后核条件/evidence/retry_when/未排除变体是否完整取得，不将作者报告或provided误称证明/模型理解，不调用真实模型。

T06小预算至少4KiB/default/64KiB关键样本，计实际成功compact HTTP JSON及真实request_id、明确truncated/规则整体省略、规则固定ref可续读、UTF8/双重转义分片正确重组，目录metadata不是全文聚合；巨大必需metadata明确422。来源更新后摘要保固定来源ref且显示现安全投影更新/生命周期状态，不能改写stored旧summary或自动补摘要。空间与focus同snapshot/空间高水位竞态用屏障，不靠sleep猜；跨页动态目录不宣称冻结全集。

每client记录起始checkpoint、投递batch、实际ack与最终catch-up边界，以独立事件账本证明零已确认丢失/无确认未投递batch、重试幂等无重复对象或业务事件、越权零。读不写/不自动ack、新会话接续、来源变更/旧ref保真都优先于延迟；20client负载不把snapshot/read误当理解。普通进程kill与备份恢复另立控制实验，不把10分钟正常负载或进程恢复外推至断电/硬盘损坏/完整T12。

## 指标、环境与修复取舍

持久保存可审计原始请求测量与汇总：总请求/逻辑操作/成功与各错误code、预定409/422与意外错误分开、p50/p95/p99（总体及endpoint）、短词search、实际HTTP预算/bytes、锁等待或重试计数及观测方法、RSS峰值/轨迹、DB/WAL/磁盘体积、client吞吐与速率。longpoll等待单列分布，不混普通响应p95；若无法观测内部锁等待不可写0或伪推断，写具体可测范围。时间源、测量进程、采样周期与日志成本冻结并说明。

报告实际OS/Node/pnpm/SQLite/已装依赖版本、CPU/内存/磁盘与资源限制/背景负载，与2CPU/4GiB/SSD目标差异。无受控资源就只报告实际主机实测，不宣布目标硬件认证，不擅装Docker/限全局/换机器。普通无附件500ms、短词1s按实际样本比较，未运行或未可比项目明确not_run/not_comparable；不能先填达标。

若出现瓶颈或语义故障，保存原配方/参数/日志/指纹，交父选最小具体修复及对应反例，获准后才动产品；不得自扩framework/Port/索引/DDL/微服务。无性能问题不为优化而改产品。任何修复新版本须独立正确性再验，不把新负载与旧负载指标混表。

## 有限验收与停止边界

正式current tests/关键回归按相关场景适度一次，统一fullsuite/current29与必要SQ/KV/SR/PR/目录/focus/H-R1回归由父据当前变化确认；不机械全跑多遍，仅失败/新修复驱动追加。验收列真实文件/项目/命令、所有首失败与重试理由、规模/10分钟实际参数及资源限制、数据/源码/旧证据完整性，独立于作者自测。其结果决定完整M2.4/T06哪些条目足够关闭，不能预先宣布M2或T10四宿主/模型、M3–M8完成。

禁止commit/push/reset/clean、发布部署、删除依赖/dist/旧证据、改用户DB/global、安装、模型调用、deepseek-brainstorm。当前唯一变更是本任务书；没有执行规模生成、烟测、10分钟负载、产品tests或build。父审阅后另启C.2执行包。
