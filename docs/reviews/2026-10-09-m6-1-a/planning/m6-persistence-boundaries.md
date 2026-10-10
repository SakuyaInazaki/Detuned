# M6 持久化与版本边界事实

2026-10-09；只读版本/classifier/generator/维护与导出直接接点。未运行测试、VM 或网络；不选择新迁移/路由/策略，不修改既有规范。

| 边界 | 当前准确接点 | 事实及 schema3 决策影响 |
| --- | --- | --- |
| 当前版本/分类 | storage-sqlite/src/bootstrap.ts:26,48–99,164–210 | CURRENT_SCHEMA_VERSION=2；先核已知表并拒未知表（61–75），迁移标记与结构一致性都受验证；高于2为 future，结构矛盾/损坏/初始化缺 marker/secret 等拒绝。只加 review 表不更新分类会使其成为 unknown，不是透明扩展。 |
| current2/legacy1 | bootstrap.ts:174–210 | v2走 V2 结构验证，并要求 initialized/token_secret/至少 human actor；v1走 V1 结构验证后 supported_legacy。两套已生成要求不是同一宽容表集合。 |
| 正常迁移 | bootstrap.ts:522–551,555–586 | applyMigrations 建迁移/metadata；缺1执行 SCHEMA_SQL并写1；缺2建 thread_versions、回填 current、迁移幂等并写2。bootstrap 将迁移/回填/metadata/身份放单事务。现无2→3分支。serve 入口也核分类（666+）；不能只改 CURRENT_SCHEMA_VERSION 数字。 |
| SQL/生成输入 | schema.sql；schema.ts；scripts/generate-schema.mjs:7–9,36–40,49+ | generator 读取现 schema.sql、不可变 tests/fixtures/historical-v1-schema.sql 和现 schema.ts 的 migration DDL markers，输出当前与历史结构要求。现没有正式 snapshot/request/assignment/submission 表；artifacts.review_assignment_id/check_run_id 只是预留字段（SQL145–146），不等于有效对象或权限。 |
| 离线 copy upgrade | offline-upgrade.ts:16,30–56 | 仅 source supported_legacy 且 maxVersion=1；readonly 源 SQLite backup→新 stage，复制登记附件，**只副本** bootstrap 至 current2，再隔离凭据/secret/新管理员并发布。返回 source_schema_version:1/schema_version:2 字面量。当前不能宣称支持2→3或任意旧库；源副本边界应保留。 |
| 物理 backup | offline-backup.ts:15,48–50,145,201–224 | format detuned-physical-backup/version1/schemaVersion2；数据库分类须 current_initialized 且迁移 max=2。源读取验证后整 DB backup和登记附件清单/hash，manifest固定2；schema3源当前不被支持，不能悄改manifest说明来源版本。 |
| 物理 restore | offline-backup.ts:230–259 | 严格接受上述 manifest，复制并验证 DB/附件到新 stage；验证current2→resetRestoredIdentity→验证current2，**不调用bootstrap，不转schema**。恢复研究/操作数据是整 DB，身份重置是另一个受控事务。新表若被正式物理格式支持会随DB复制，但其角色/封存输出语义不由backup格式自动保证。 |
| 逻辑 header/解码 | protocol/export.ts:17；core/services/space-export-service.ts:153–154 | NDJSON format/version1，source.schema_version严格Literal2，scope public_research、identity source_actor_ids_only，formal_review_status/formal_check_status 固定not_enabled。现在不能声明已启用正式评审源而仍不解释这两个字段。 |
| 逻辑输出集合 | storage-sqlite/src/space-export-snapshot.ts:7–19 | 固定10族：space/space_revision/thread/thread_version/post/post_revision/relation/relation_resolution/revision_artifact/artifact；仅space可见artifact及关联。**没有自动SELECT所有表**，新增正式评审表不会自行输出。普通review/decision帖子仍是研究post，不等于正式批准。 |
| 逻辑 import | logical-import.ts:34–40,65 | 新stage bootstrap当前schema→严格decodeSpaceExport→逐族研究导入；新独立admin，原actor IDs为disabled来源身份，ready附件转missing。provenance summary 固定formal not_enabled。目标未来升至3并不意味着输入v1携有正式对象/身份/批准；当前源header只接受2。 |

## 根需冻结的边界（未知，不在本报告选政策）

- schema3具体表/约束、v2→3迁移与blank/v1路径、结构profile和版本marker联动尚无实现。现M6.1-A canonicalizer/内存快照不构成持久review存储。
- 物理backup/restore的format1是否扩可接受来源schema、旧2备份在新runtime如何恢复/升级、离线upgrade支持集合及新身份对assignment/session的影响需明示；当前函数无法提供这些保证。
- 逻辑public_research是否保持只研究对象，以及schema3 header/formal状态如何准确表达、封存评审附件是否绝不进入公共族/摘要/导出需分别裁定。固定族避免自动导出新表，但新代码必须继续维护可见性，不可据此视作已验封存隔离。
- 本次只核上述入口，不断言所有部署/CLI/readiness版本显示点已列全；下一实际持久化包需以冻结文件边界核这些直接调用，不能默认向任意legacy降级或把旧导入材料认证为正式决定。

## 根追加：公开返回、统一写入和事件接点

### 维护结果与 literal2 依赖

- `offline-backup.ts:191`：backupOffline(options:BackupOptions)→Promise<{backupDir:string;manifest:BackupManifest}>，manifest声明/构造的schemaVersion:2（15/224）；CLI index:179–180 原样映射 schema_version=result.manifest.schemaVersion，不另硬编码2。
- `offline-backup.ts:231`：restoreBackup(options:RestoreOptions)→Promise<{dataDir:string;adminActorId:string;adminToken:string}>；CLI index:189–190 仅映射 data_dir/admin_actor_id/admin_token，返回没有schema字段，不自行bootstrap转换。
- `offline-upgrade.ts:30,56`：upgradeOffline→Promise<{data_dir,source_data_dir,source_schema_version:1,schema_version:2,upgrade_id,admin_actor_id,admin_token}>；CLI index:231–233 整result输出，literal2由维护接口提供。
- 直接查询 shared client/src/client.ts 未命中 schema_version/schemaVersion 或这些本地维护调用；维护不经HTTP sharedclient。client export依赖 protocol/export.ts:17 的 source Literal2 类型/decoder契约，不是client里另一硬编码迁移路径。

### 统一幂等、限流、事务与 event

- `core/services/idempotency-service.ts:2617–2684`：executeIdempotent<T>(actorId:string,spaceId:string,operation:string,key:string,payload:unknown,statusCode:number,action:(tx:StoragePort)=>T,beforeAdmission?:(tx:StoragePort)=>void)→{data:T;isReplay:boolean}。请求hash仍是旧Hasher.canonicalJson+sha256；storage.transaction覆盖查询原record、fresh action、compact result_ref校验和record写入。replay同hash重建当前可见结果、免扣；fresh beforeAdmission在admit前；admission后失败不退款，DB事务回滚。
- 依赖注入（idem:2609–2614）storage/hasher/clock/可选shared WriteRateLimiter；`server/app.ts:117,120–121` 创建唯一idempotency并注入ThreadService/PostService。两service constructor（thread:28–35；post:21–28）为storage/idGen/clock/hasher/AuthService/IdempotencyService。
- createThread(auth,spaceId,req,requestKey)→CreateThreadResult {thread,initial_post?:{post,revision}}（thread:19–25,50–56）；先contributor权限，然后thread.create operation的action中创建thread、可选首帖/关系及events（84–207），返回.data。createPost(auth,spaceId,threadId,req,requestKey)→{post,revision,relations}（post:43–69），operation=`post.create:${threadId}`；action以tx写post/revision/relations和metadata事件（123、166、179）。现创建权限在方法前；支持beforeAdmission的统一API可用，但不能说所有创建方法已经额外逐对象callback。
- 自定义 review 写operation不能只传一个新字符串/任意result：parseOperation（idem:98–160）未注册即RESYNC_REQUIRED；typed IdempotencyResultRef union、validateResultRef（950+）、validateResultRefSemantics（1227+）、extractResultRef（1415+）、reconstructResult/reconstructFromValidRef（2294/2356+）都是明确分支，extract默认拒任意对象序列化（1682+）。新result恢复须同步注册与scope/对象/版本语义、错误/撤权投影，不可沿旧结果blob保存完整sealed内容。此处只是现调用链事实，未选择新operation或DTO。

### review 事件不是现成封存投影

`protocol/events.ts:17–22` 已枚举 review.requested/revealed/finalized/invalidated 与 check.completed/invalidated；EventSchema（34–44）只有 id/space_id/seq/type/object_id/revision/visibility/actor_id/created_at，**没有正文payload**。visibility为public|review_assignment（27–30），没有assignment_id归属字段。

SQLite appendEvent/listEventsAfter（sqlite-storage.ts:1075–1125）写/读上述metadata；`event-service.ts:175–197` replay与fresh只接受visibility public。thread filter仅显式识别thread/post/relation，其他类型被排除（199–213）；不存在review request/assignment授权投影或sealed事件定制处理。故不可把“已枚举review类型”当已实现安全分发：若新写把review事件标public，object/actor/revision metadata便按public发送；若标review_assignment现public消费会跳过，并无assignment专属消费者。首个持久review事件需要根明确允许公开哪些metadata、何时公开以及后续私有分发语义，不能默认安全。

## 根选定路线落点核查（M6.1-B 草稿，只读）

已读本包 planning/m6-1-b-task.md。以下是其选定范围的真实接点，不是提前实现或新增路线。

- export header 的 `format` 始终是 `'detuned-space-export'`，数字字段叫 `version`，来源叫 `source.schema_version`；physical manifest 则是 camelCase `schemaVersion` 与数字 `version:1`（export.ts:17/offline-backup.ts:15）。新逻辑2/source3/excluded与旧1/source2/not_enabled应使用严格相关分支 union，不能三个独立union而接受错配。decoder依赖validateSpaceExportLine，client/export-stream依赖header类型；沿其完整EOF/hash/取消算法即可，不需新增第二套reader。
- 最小可靠source2冻结是**修改前当前完整 schema.sql 原字节**保存到专用 historical-v2-schema.sql，并记录SHA；现 schema.ts 的 V2 profile只记录结构要求，不能替代完整可执行DDL（FTS/index/trigger等）。旧v1 fixture原字节不变。新的v2 .ts不是generator内在要求；如需导出legacy SQL，可由现生成schema.ts加专用常量，具体名字在正式接口冻结时定。
- generator当前把schema.sql当V2源（generate-schema.mjs:49+、119+），check-schema-sync也直接current SQL→expectedV2（81–107）。这与schema3有**真实机械冲突**，必须改成独立v2源→V2、current SQL→V3，并同步schema.ts的 `verifyDatabaseStructure(version:1|2)` /二分选择（3641–3645）。既有extractDatabaseRequirements是结构提取器，不因加表必然要改；仅实际新DDL特性超其能力才需窄变。classifier已知表集合/marker/profile和bootstrap迁移分支必须联动，不可只加版本数字。
- copy upgrade目前 validateDB(legacy=true)只supported_legacy/max1、输出source1→2（offline-upgrade.ts:16/30），先只读源验证→backup stage→验证原sourceprofile→复制附件→**stage bootstrap**→目标profile验证→身份隔离（43–52）。扩1|2→3需要区分来源profile，但迁移只能在已复制且原profile验证过的stage，不能用新current-only验证误拒合法source2，也不能回到源bootstrap。
- restore现在按manifest复制/hash验证→validateDatabase current2/matchInventory→identityreset→current2验证（offline-backup.ts:239–252），没有bootstrap。支持旧2/new3须先依manifest验证实际sourceprofile和inventory，只有stage2再bootstrap至3，然后target3验证/身份隔离/发布；stage3不伪造升级。原source backup字节/manifest不变。草稿“backup manifest仍标原source2”应明确指**原旧2备份**保留2；新current3 backup输出3，不能让同一新备份来源/manifest矛盾。
- logical-import在新stage先bootstrap（36），再decode并记录header.source和formal not_enabled摘要（65）；目标3与source1/2 NDJSON兼容不是同一版本概念。summary要按真实header formal字段记录excluded/not_enabled，正式五表保持空；固定10导出族没有新表自动枚举。core export header硬编码2/not_enabled（space-export-service:153–154）必须改；原chain算法/公共投影保持。

草稿ownership无双写冲突：StoragePort/core index仅A，SQL/storage index/generator/维护/export相关路径B。真正新port接口须先A/B精确冻结；旧builder/Hasher/旧v1fixture继续保护。当前未改任何这些产品路径、未运行schema生成/测试，也未操作VM。

## 下一包 existing tests 精确同步候选（仅rg/邻接只读，未授权修改）

| 路径/定位 | 必要理由、新旧语义 |
| --- | --- |
| tests/integration/m0-m1-r4-b-regression.test.ts | 653/774/836/1163/1177/1420等以current bootstrap后仅drop thread_versions/metadata+删>1 marker“造v1”；新增5表后不是真v1。需有限共同fixture转换或真实legacy构造，保旧幂等迁移/故障回滚断言，不能让unknown表误盖原故障。B2-8/Y04约3384/3600将SCHEMA_SQL/当前serialize命名v2、并期望historical-v1 serve升级；须区分当前3/raw-old2/真old1，serve拒legacy的新规则需明确改这些期望，保init与已有数据故障诊断。 |
| tests/integration/m3-backup-recovery.test.ts | 73用schemaVersion=3作为不支持格式；3现在合法，需要真实未来/混配反例而非删测试。138插migration3作future会撞现marker；未来须>current且保拒绝。139造legacy只删2/drop两表需完整legacy来源，否则覆盖域改变。source新backup3、旧backup2恢复正例应独立保留。 |
| tests/contracts/m3-backup-cli.test.ts:46 | 新bootstrap/current来源备份stdout schema_version:2需3，format/version仍1；不是把所有backup2样例改3。 |
| tests/contracts/m3-offline-upgrade-contract.test.ts:11,14；tests/integration/m3-upgrade-independent.test.ts:21,25,34,45 | fa1b原runtime/source migration1必须仍1，输出/目标迁移max2需3；原thread version2/历史[1,2]完全保留。45原current2第二次upgrade被拒测试需按“现在允许source2、不允许current3”精确重构，不弱化目标存在保护。 |
| tests/integration/m3-space-export.test.ts:37；tests/contracts/m3-space-export-contract.test.ts:64 | 真current导出header需version2/source3/excluded，仍10公共族/hash/完整性。旧format1 deterministic vectors与decode兼容反例应保留。 |
| tests/integration/m3-logical-import.test.ts:12；tests/integration/m3-import-independent.test.ts:29,35 | 真新导出来源summary formal状态需excluded；35把header.version=2作为future现在不成立，需未来或错组合负例，保重新hash后的严格语义拒绝。旧version1/source2/not_enabled兼容正例仍需真实保留。 |
| tests/helpers/m3-export-worker.mjs:39；tests/fixtures/runtime-fa1b35c/**；tests/fixtures/historical-v1-schema.sql/.ts；tests/integration/m0-m1-r3-regression.test.ts:289–291 | 固定旧wire1 rawfixture/真实v1 runtime与不可变DDL**不应批量改**。worker旧header仍是decoder兼容证明；真v1分类仍supported_legacy。旧row relation/thread/post revision的2与3都不是DB schema。 |
| tests/helpers/m3-operations-worker.mjs:21–22、m4-read-cli-worker.mjs:28–29；tests/contracts/m5-post-order-index.test.ts:31,64、m3-resource-limits-contract.test.ts:43 | 只改migration2→999→2的worker可能仍保持所有原marker并正常恢复，无证据必改；当前分类kind仍current_initialized，真legacy仍supported_legacy，先保，不能仅rg命中就扩授权。m0-m1-regression:336只>=1也无需改。 |

scripts/integrations/deployment有限schema/version rg未发现这类字面量断言；无需为schema版本修改已接受D01业务thread/post版本。根仍应逐组批准，不能全局替换2或“future3”。旧T08/T12等归档脚本不可回写，当前探针若受影响应本包新adapter保持原证据。

预计唯一必须新fixture是 `tests/fixtures/historical-v2-schema.sql`（当前完整DDL exact-before/hash），另 `tests/fixtures/historical-v2-schema.README.md` 可记录固定来源/hash/生成recipe，不是新runtime包。无需先造.ts：测试可readFile该SQL；若标准test import确实需要常量，则才新增 `tests/fixtures/historical-v2-schema.ts` 且从同SQL机械生成/hash同步，不手写第二份DDL。新source2初始化身份fixture应在新schema3-maintenance测试内受控构造，不能沿current bootstrap冒old2。上述候选仍未修改/运行。
