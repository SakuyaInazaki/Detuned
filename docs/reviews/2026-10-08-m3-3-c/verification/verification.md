# M3.3-C 独立验收（2026-10-08，父已接受）

父于2026-10-08接受本报告明确的有限本机受支持schema1→2复制升级与匹配旧runtime原实例回退范围。最终实际 449/449、54/54，通过；新增13项已含总数（A6+B3+C4）。唯一 workspace build、typecheck、lint、完整 suite 各一次，25保留探针各一次，共 current29 29/29。没有把额外定向命令累加成新正式场景。早期夹具失败与父范围澄清均保留。

## 实际命令和失败归因

首次新三文件 targeted 为8/13、1/3，5项失败：B UPB02 的完整旧HTTP缓存实际可回填[1,2]，却仍期待[2]；C三项用误写的 CLI `upgrade`，实际冻结命令是 `migrate`，退出1；C坏FK夹具把两个membership改同一个PK，先撞UNIQUE。都是具体测试夹具问题，不能称产品回归、缺API或尚未实现。原 `observed-new-targeted-*` 不覆盖。

C修命令名和定点一个membership row后，第二单文件3/4：真实升级/新代际游标、原运行时回退、取消/发布故障均过；人工future-schema副本先写后close，原无WAL，SQLite readonly拒绝后新建正规0-byte WAL，深目录inventory断言失败。DB/登记文件字节保持；父明确冻结原本保证主DB、现存WAL和登记文件，允许原无WAL时新建正规空WAL协调文件，不能允许新增非空WAL、删改原WAL或业务写。不是产品bug修复，不称源目录零写；不为清空WAL增加源unlink竞态。C窄改oracle逐一比所有原有文件hash/不得删除，新增只允同位置正规非link且size0的WAL。原 `observed-independent-corrected-*` 失败保留。

B改UPB02完整历史期待[1,2]、ORDER BY version，其余断言不变；C上述两次夹具修正和协调边界澄清后，必要B+C定向7/7、2/2通过。A6首次已过，没有单独重复A。产品没有因这些验收夹具失败修改或重新build；执行期test/doc授权delta与最终稳定窗口分开。最终 typecheck/lint/suite 与25保留probe后全部成功，无unhandled。

作者的兼容首假设[2]也是夹具期待错误：fa1b35c真实旧HTTP必需key、无TTL，完整create/patch缓存能回填[1,2]。另明确人工删除指定thread.create操作缓存、保研究实体的受支持v1边界，在窄修前原logical import确实拒合法[2]导出，属于真实兼容缺口；本包修logical-import仅允许thread历史缺口，所有版本在1..current/current必须存在并字段匹配，provenance history_complete=false，不伪造缺历史，space/post仍完整。旧B2证据/契约未回写。作者真实oldruntime bundle工具解析前三失败与正常依赖入口修正另见B报告；没有把未生成bundle的环境失败包装成旧HTTP运行失败。

## C四项独立进程的具体证据

1. **真实旧→新闭环与两种历史。** 固定 `fa1b35c80de02c1d601288847706495062935925` 原源码bundle（runtime sha256 `210d4fa39a15a320b99e6bfa85bfcf621c5c928418a0f029354963ae3d6eab8c`），普通回归不Git、不再生成、不安装。old-server进程真实bootstrap迁移1、独立client进程经HTTP创建空间、thread.patch版本2、Unicode正文两修订、固定关系、普通actor/权限/凭据、真实pending batch。旧runtime没有附件HTTP API；注册ready附件行和真实文件单列为私有directSQL fixture，未冒称旧原生上传。

   固定owned wal-seed进程在schema1源完成明确COMMIT后IPC通知，只SIGKILL/reap这一个子进程，留下真实非空WAL且无活writer；不是保writer handle的假替代。built `migrate --offline` 新进程成功后，主DB、现存WAL、登记文件全部逐字节相同，lock/SHM按协调边界分离。新schema2服务进程读取原修订和真实附件bytes/hash；固定关系在源/回退SQL及随后的真实export/import中保留，未另作current关系route专项。来源凭据401，新humanadmin发同原actor新凭据，GETme成功；old cursor ACK409且代码ACK_INVALID，新poll复用原pending batch，新cursor不同且ACK200，新普通写201。这同时排除用旧token401或当前权限拒绝冒称新secret失效。

   完整原HTTP缓存升级后thread_versions=[1,2]；current export→真实built logical import成功且thread.history_complete=true。另复制私有原库，明确人工删除恰好一个thread.create缓存（不删除研究，不称过期或所有v1），再upgrade/export/import成功，thread_versions仅[2]、provenance false。两分支都保持当前title/state，不假造旧历史。

2. **真正旧运行时回退。** 先完成原DB/WAL/附件字节保持比较，再以匹配同一原bundle+原外部secret重开原schema1实例：旧凭据读版本2正文成功、thread版本2/关系固定ref/附件hash保持、迁移记录仍1。原pending仍同batch，原oldcursor实际ACK200；旧普通身份新增研究201，证明原材料与cursor有效、原服务可继续。回退重开/正常close可能checkpoint原WAL，因此不在此操作后虚构物理hash仍不变。不是current2 restore逆迁移，也不是逻辑import恢复旧权限。

3. **拒绝源与覆盖。** 独立固定lock-holder持合作DirectoryLock时offline migrate拒，释放后原源材料保持；其不代表旧binary天然有新版lock能力，也不防绕锁writer。future-schema、坏ready bytes、坏FK、越界登记file软链各拒且不发布目标，原有主DB/WAL/登记文件逐字节不变，原无WAL仅可新增正规空WAL。已有目录sentinel保持。坏FK定点单row，无大量孤儿压力实验。

4. **取消与持久点。** 独立upgrade-worker在after-copy取消为UPGRADE_CANCELLED；before-migrate、credential-reset、destination-created、publication、file-sync、readiness有限fault返回UPGRADE_FAILED，源原有DB/WAL/files保持。file-sync首调用实际在stage/发布前，目标不存在；destination-created/publication/readiness后存在的部分目标被built init/serve拒INCOMPLETE_DIRECTORY。真实chmod父目录不可写，在readiness-unlinked注入parentsync失败，marker重建失败准确报完整目标可能可启动/持久性未确认；目标DB/FK/schema2完整，调用方没收到token，保原源另新目录可重做。不能将完整目标误称partial损坏，不能保证每种故障都有marker。

helper只有server/old-server/client/upgrade-worker/lock-holder/wal-seed固定模式，私有IPC，无任意shell/function执行面。stdout含一次admin token仅内存parse；断言非敏感字段或布尔，不归档原stdout、不比较全成功JSON。清理finally逐owned child回收与private目录删除，无泛pkill。

## 独立只读审查与保护

核读readonly源open/no source bootstrap/SqliteStorage/checkpoint、current staging迁移、有限driver progress≤100页+await后check、逐登记artifact同FD NOFOLLOW/regular/hash/bytes校验、≤10k/25MiB、私有copy完整write/sync、current复核后新identity事务、唯一nooverwrite publication/readiness与finally资源释放。同步native SQLite单步不能被JS deadline硬抢占；合作同UID边界不保证恶意无锁writer。现有backup-format、serve/init隐式迁移和schema2均保持，四未来全模块不假称已经迁移。

fresh基线为source187/docs41/mutable5、oldreviews3887（含B2全124文件）、SQL/archive4、schema2、dist208tracked/100untracked、HEAD b8dacd5。最终source197（授权新增10、修改4）、docs42；全部3887旧材料、SQL4/schema2、五mutable、HEAD保持原字节。dist唯一build预期tracked6改、untracked新增4/改6，无文件移除。最终stable-before/after产品、docs、mutable、SQL/archive/schema、oldreviews、dist哈希全部一致，作者freeze全匹配；详情integrity.json。前期授权test/doc修正不能并入“全程零变化”声明。

cleanup.json真实upgrade-worker残留0，A/B/C升级private目录0；本包105归档文本有限mintedtoken形状0命中。有限扫描不证明任意研究正文自动脱敏或所有DB敏感数据不存在。没有额外大材料/600秒负载、模型推理、四宿主/网络认证；已有40MiB导出formal随本轮唯一fullsuite自然一次（640row、wire42,399,852bytes、receiver42/server4heap样本，仅佐证，不硬RSS证明）。

当前通过范围仅固定受支持schema1→schema2复制升级、保原实例匹配旧运行时回退与上述本机边界；任意旧/未来版本、通用降级、介质灾难、跨平台持久性认证、完整M3.4/M6/M7仍未完成。
