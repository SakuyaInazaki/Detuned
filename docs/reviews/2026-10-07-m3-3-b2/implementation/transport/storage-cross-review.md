# M3.3-B.2 B→A只读互审

2026-10-08，读A初版logical-import.ts、offline-backup窄导出publication helper/index、冻结契约及10formal。未改A源码/tests，未运行新实验或大suite。两项具体阻塞已报父/A/C，父已授权A窄修；本报告保留首finding，待定点closure。

F01：logical-import.ts:34先await open(O_RDONLY|O_NOFOLLOW)再sameFD fstat。末段FIFO无writer时只读open阻塞，fstat正规检查不能到达；timer/外部Abort仅改变controller，不取消挂起FSopen，可能无限挂且无法按timeout/SIGINT退出。真实触发是FIFO作为input，目标不存在，其余参数合法。建议NONBLOCK打开后sameFD拒非正规，保NOFOLLOW；未由B增加实验，父批准A≤2秒child回归。

F02：logical-import.ts:94 db.pragma('foreign_key_check')全量返回违约数组，却只使用length。合法chain含大量父thread_id不存在的thread_version，可借deferFK逐行落库，前面实体遍历没有其父记录，最后收集可达record量的违约JS对象；不是逐条有限验证。建议prepare('PRAGMA foreign_key_check').get()首条拒；integrity_check默认有限诊断与此不是同规模问题。未由B跑压力实验，父批准A窄修。

其余只读核实：十族explicit投影，未知数据不拼SQL标识符；來源actor复用ID但新建disabled agent、无credential/membership/session，拒与新admin/synthetic随机ID撞；bootstrap生成独立human+*admin凭据，现formal验证AuthService可用，未继承source资格。墓碑空字段/localhash/syntheticprovenance，不FTS；ready转missing不抓URL，未知可见正文仍研究数据。各space/thread/post不可变版本完整，thread最终metadata一致，relation固定postrefs同space、resolution重复version/tempPK和范围、存在terminal时状态一致；历史缺口按契约保留history_complete false，resolution输入不强制按version排序。四knownstructured refs+spacepins严格shape/存在性，未知字段不增识别。metadata每条16KiB、hashkey定位、INSERT不覆盖initialized/token_secret，sourcehash仅来源，不变认证。

业务/staging未全集数组，逐条INSERT+128条yield；逐rowid finalvalidation并检查取消，SQL单次不能硬抢占。源NOFOLLOW/sameFD、父realpath受信边界，目标与marker初检后publication原子预留/独占mkdir/锁再发布，不以初检代替独占。source不改；stage/输入fd/listener/timer在finally清。token不传hook/日志/metadata，成功仅return；取消/timeout在record/validation/commit/publication/readiness前检查，unlinkready后已完整发布不再描述半套或无条件撤回；父目录sync双故障保既有准确勿用/另newdir诊断。既有目录竞争EEXIST只清自有marker不删目标。

B自身Aready后唯一必要sourcealias noEmit（含CLI及真实A导出）exit0，见source-noemit-cli-ready.log/.exit-code；发生在上述窄修前，不能替代A后续freeze类型或C统一build。这不是产品正式suite。本次B产品/test原hash不变，后续只追加finding closure。

## 2026-10-08 F01/F02定点closure

两项已关闭，原finding保持。最终冻结logical-import.ts:34添加O_NONBLOCK，保留O_NOFOLLOW及同打开fd的stat.isFile/size校验；FIFO不会在fstat前等writer。fifo-before.mjs/log保旧flags真实无writeropen挂起、1500ms watchdog杀并reap的有限before；新增formal用2s watchdog child调用真实importSpace得到INVALID_INPUT、未publish且源FIFO保留。tests-fourth.log记12/12通过，不与child或旧作者轮次累加计数。

logical-import.ts:94改prepare('PRAGMA foreign_key_check').get()，仅取得首违约即拒；不再创建随全部违约增长的JS数组。新增孤儿thread_version合法chain负例拒INVALID_INPUT且无目标，未另造百万违约压力实验。此关闭基于源机制与已有有限正式证据，不证明硬CPU/无限容量。A typecheck-fourth现有证据通过；B本次未重跑checks或改产品/tests。

共用decoder抽取只读复核：固定max_line_bytes缓冲，逐chunk segments填入、按LF复制exactline；fatalUTF8/strictschema/连续seq/链/count/bytes/end+EOF保持B.1wire，HTTPexpectedSpaceId在首header且回调前检查；callback await背压/provisional。signal race观察迟到拒绝、finally移listener、iterator.return不阻塞；HTTP外层原timer/Abort分类和reader.cancel/release/abort finally保持，ExportDecodeError映射ClientProtocolError，其他HTTP/transport类型及no-retry保持。未见新增阻塞；已有5source针对HTTPwrongspace/timeout与decoder挂sink/iterator取消，不冒称built第6已运行。B产品/test仍冻结，现停写待C统一built独验。
