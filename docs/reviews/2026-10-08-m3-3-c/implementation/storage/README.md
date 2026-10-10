# A M3.3-C 作者证据

API与边界见planning/frozen-contract.md，新增offline-upgrade及窄导出copy/resetidentity/pub复用，不扩backupformat、schema/SQL或隐式serve/init行为。source只读backup≤100pages/progress与postawait取消；源无bootstrap/SqliteStorage/checkpoint，target事务撤旧creds/新secret/admin；keyset附件登记≤10000与25MiB/hash/state，未登记不复制，stage/publish无覆盖。

first noEmit通过。thread-gap-before.log首真实oldHTTP保完整create/patch缓存得到[1,2]，expected[2]夹具假设失败，未到import；保原日志，不泛称所有v1缺history。核fa1 routes必需key、IdempotencyService无TTL；父批准人工兼容profile，仅privatefixture删thread.create key=thread缓存行，研究行仍真实oldHTTP。thread-gap-before-incomplete-cache.log再跑原import拒稀疏[2]（1pass4skip），然后仅thread范围/current/metadatafalse窄修，不动space/post或旧B2frozen/report。

主能力tests-first.log四pass一skip；兼容修后tests-second.log六pass，sourcealias typecheck-second exit0。before专测与formal复跑不累加场景，不称首次全绿。主正例维护前后比较source.db及现WAL bytehash；oldapp关闭但保writerDBhandle保障原WAL存在。realoldfixture有fixedhashruntime而非b8schema2；人工附件profile单列。旧runtimerollback重开与授权新写、完整oldcursor同actor新cred及realCLI/各faultmatrix由C独验，本作者未实跑这些或fullsuite/build。

SQLite同步step/pragma不可被JS deadline硬抢占；长backup可有SHM/锁协调变化，不宣称源目录零写或抵挡绕锁writer。一次token不入证据/清单，交付丢失换新目标重做。

## 作者最终窗口

补artifact字段严格类型检查后tests-third.log 6/6与typecheck-third.log源码alias noEmit通过；这是产品窄变更后相关定向，不是第二fullsuite或新增formal场景。共有首compat假设失败一次、四主case一passwindow、正确人工兼容before拒流一次、修后sixcase第二与third各一次；证据命令/run实际分开。A仅本新6formal，不改旧B2tests。

源WAL成功证据限定oldapp已关闭但writerDBhandle存活；不外推最后handleclose/SIGKILL遗留WAL行为，C以独立进程退出遗留WAL验证。B只读互审见transport-cross-review，产品最终hash见freeze-manifest；C统一build/fullsuite，尚不宣称最终本包接受。

## C实际协调sidecar发现的边界精确化（doc-only）

C真实dead-WAL/oldACK/newcursor/rollback/fault已证实主DB/原WAL核心保持；futureclone原无WAL时只读SQLiteopen创建正规0-byteWAL，非产品业务写。原发现由C保留，inventory oracle调整，不称产品bugfix。原有WAL仍须逐字节保持；原无WAL时允许SQLite新建正规0-byte协调WAL，与SHM/lock同属协调sidecar变化。禁止非空新增WAL或业务写；不清理源empty WAL，不引入unlink竞态，也不使用会漏读遗留WAL的immutable打开。此边界不承诺源目录完全零写。
本次仅docs07/ADR039/frozen-contract/report更新，无产品/tests修改或作者重测。
