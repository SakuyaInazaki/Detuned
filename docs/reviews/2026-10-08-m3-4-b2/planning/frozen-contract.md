# M3.4-B.2 冻结：有界退出与显式资源释放

C fresh 基线完成后按父冻结实施。A owns lock.ts、blob-store port/artifact-service、artifact-files.ts、新 runtime-resources.ts/server index该导出、新 m3-shutdown-resources.test.ts、docs07/ADR043；旧fake仅窄契约适配，原业务断言不变。B owns app/routes/CLI组合预算，C统一build/gates。无SQL/schema、旧review或用户数据改动。

BlobReadHandle={chunks:AsyncIterable<Uint8Array>,dispose():Promise<void>}；open必需返回handle或null；ArtifactContent内部传播dispose，不进入公共JSON。实际ReadStream dispose幂等destroy并等真正close；已closed立即完成，不依赖未first next的iterator.return，error发生也不能提前假称FD关闭。B从awaitopen前登记lease，晚取消handle必须立即dispose，finally真正结束才finish；metadata exists也跟踪await。

RuntimeResources：closing/activeCount只读；acquire(cancel:()=>void)返回幂等finish；closing新lease固定503 SERVICE_NOT_READY/retryabletrue。beginClosing同步置closing、遍历全部cancel，单项同步throw记失败并继续；owner负责异步cleanup/dispose，完成后finish。waitForIdle只能closing后等待所有finish，cancel错误待idle后固定拒绝。无socketclose即finish、后台task或新公共metrics。

DirectoryLock.releaseStrict新增不改旧release/offline语义：close失败不unlink且保fd状态；close成功后立即清fd，再unlink，unlink失败保待unlink状态且固定无路径诊断。成功后重复幂等，不将已关闭fd重复关闭。A不process.exit。

B统一预算默认10000ms、safeint1000..120000；首SIG置closing/取消全部/等finalization→appclose→DBclose→strictlock，重复signal不另清理。deadline或phase错非零退出，不先关DB/放锁留下异步mutation；同步native不可JS timer硬抢占。B.1日志仅复用既有sink，不预建通用关闭框架。

A新增约6实质场景：真实FS handle未next/晚取消/正常read与幂等dispose，lease wholefinally与全cancel先行/closing拒、cancelthrow隔离、strictlock正常重复及close/unlink失败准确状态。source定向/noEmit待共享源码稳定，最终built由C。所有首失败保留，作者通过不代独验/父接受。
