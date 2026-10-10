# M6.1-B：持久评审请求与固定名单（根已冻结，下一fresh后实施）

M6.1-A有限材料构造/JCS已接受，见[本包结果](../README.md)。根已完成范围与九旧测试逐组授权；下一包需完整新fresh后正式分配，现未改DDL/源、未建fresh。只内部业务纵片，不一次实现M6/M7。继续用户环境禁令：无VM/容器守护/新常驻后台、安装/模型/网络依赖/global配置/推送；既有本地Node/pnpm与短寿命owned测试可用。

## 纵片与不可变对象

schema2→3只加实际调用5表：snapshots、snapshot_items、review_requests、review_request_versions、review_assignments。submissions/decisions/checks留后续版本，不能生成空表/空route。request当前head与不可变versions分离；本包只collecting创建、cancelled取消，但phase保完整enum。每request独立snapshot，同(space,target_post_id) round在同写事务递增，唯一(space,target_post_id,round)。assignment固定unique(request,reviewer_actor)，保存group_at_assignment，不虚构submitted state/session。

新ReviewRequestService位于modules/review/src/request-service.ts，模块index仅薄export，注入storage/auth/idem/clock/idGen与已接受builder，builder签名/实现默认不变；禁止core反向依赖review模块。仅内部createRequest/getRequest/getSnapshot/cancelRequest；不开放HTTP/CLI/MCP/Pi/Web/正式enabled广告。create现DTO+独立requestKey；cancel补required expected_version正safeinteger、reason非空白≤500+独立key。响应固定单个平面ReviewRequestView：id,space_id,target_ref,snapshot_id,snapshot_sha256,rules_revision,policy_revision,round,phase,version,requested_by,created_at,changed_by,changed_at,reason(nullable),reviewer_actor_ids(UTF16排序)。create固定v1/collecting/reason null，cancel固定所写版本。getRequest只读取current head；getSnapshot另授权返回{snapshot_id,space_id,manifest_sha256,manifest,created_by,created_at}。无正文/group/意见混入request view。方法沿现AuthenticatedContext/spaceId/id或req/key，不加HTTP。protocol持久records/View不导入module类型。

## 当前身份与正式申请资格

同写事务refresh凭据/space访问。申请者目标作者或当前maintainer/owner，作者仍需contributor写权限；virtual admin可管理但不能自动算reviewer。policy.enabled/exclude_contributors/distinct_actors/seal_until_all_submitted/invalidate_on_revision须true，unsupported正式申请固定VALIDATION_ERROR400，不改旧space写及默认eligible语义。

人数精确required_reviewers；每reviewer真实actor存在active、kind human或agent、真实active membership且reviewer_eligible、非manifest contributors、不同actor。distinct_independence_groups启用则组非空白互异，否则只存当时值；不声称认知独立。资格失败固定400，不泄无权身份。fresh创建调用builder，现policy/current refs/附件严格合同保持；外部贡献者显式申报。

## 原子写、typed幂等与历史读取

冻结operation名 `review.request.create` 与 `review.request.cancel:<requestId>`。接现IdempotencyService全部parse/typedref/shape/semantic/extract/reconstruct，无完整response/sealed blob回退。ref绑定requestID+不可变version+snapshotID+manifest_sha256。core若需共享重构helper仅新review-request-records.ts负责真实metadata/ref/hash/可见性，不移动/调用模块canonicalizer，不形成循环；core核原raw SHA与ref/header/items，不能用旧canonicalJson代替JCS。完整canonical验证在review服务getSnapshot。状态、snapshot/items、assignments、event、typed idem与actor限流同现write事务提交。create replay在cancel或policy改版后重构v1；cancel replay重构当时version/reason/time，不取head、不重复event/计费。当前caller ACL始终重核；仅fresh重判申请资格/current policy，旧key不同payload仍409。

跨space隐藏404；非作者/maintainer403；version冲突409 REVISION_CONFLICT；fresh cancel仅collecting，非collecting fresh cancel固定VALIDATION_ERROR400，已cancelled用新key不是伪幂等。并发round、同keyrace、rollback、重开库正式测试。

snapshots保存exact canonical JSON/hash、space/policy/rules/target、created_by/time；items固定target/dependency post、显式artifact与rules反向refs。各PK项NOT NULL；artifact revision=0哨兵，post/rules正整数。items枚举target_post/dependency_post/artifact/space_rules，item_id为对应ID，sha256为post/artifacthash、rules null；PK(snapshot_id,item_type,item_id,revision)全NOT NULL。target/rules各恰一个，其余与manifest完整一一对应，重复拒绝。全对象与requestv1同事务，不变异manifest。

历史get/重放需当前space权限+材料保密性；同space红acted材料410、不可见/跨space404，不经manifest复活内容。仅出现新revision允许历史材料read/replay，不标当前批准。getSnapshot核canonicalbytes/hash与ref/header/items一致，坏持久记录RESYNC_REQUIRED409固定安全拒不修补。getRequest/getSnapshot/idem replay先当前ACL与redaction/privacy门禁，授权错误优先；仅新revision不拒历史。当前写caller仍须contributor或维护权限，只有fresh action重判申请资格/currentpolicy，历史replay不因后来的policy或名单资格变化偷换v1；DBready仍非现场blob验真。

仅public review.requested与新增review.cancelled：object=request ID、revision=request version、actor真实操作者，无正文/结论/group。thread-filter通过target post所属thread明确匹配，现space过滤保持；无assignment私有消费。未来封存submissions不得进posts/FTS/public event。

## schema3分类、生成与离线维护

保legacy1及完整historical2结构profile；先冻结真实v2 DDL来源+生成配方，不能以单schema.sql冒充全部migration2。blank/v1/v2→3只新实例/目标stage，serve拒未升级legacy，无原地静默升级。离线copy升级来源1或2→3，源DB/既有WAL/附件保持原合同，失败清owned stage、无半发布；身份隔离沿旧。未来/extra/矛盾profile拒；实际historical2可执行fixture正式保留，旧v1fixture原字节保护。

物理backup format/version1不变，新schemaVersion3；restore严格支持旧schemaVersion2及新3 profile与附件，2只新stage受控升3再identityreset，3原结构恢复。旧schema2备份原manifest保持2，新current3备份必须写3；restore原return不必破坏。upgrade source_schema_version=1|2/schema_version3，CLI原映射必要typing同步。current3backup真含5表、恢复历史完整。

逻辑导出现实字段是header **version**（protocol/export.ts:17），不是format_version；新version2/source.schema_version3、public_research、formal_review_status/formal_check_status='excluded'。保公共10族与sha256-chain-v1；不导正式snapshot/request/名单或assignment artifacts。decoder/client/import同时严格支持version1/source2/not_enabled与version2/source3/excluded，未来/混配拒。import目标3、source actor disabled/附件missing/新admin沿旧，正式5表空；provenance记真实source version/schema/excluded，不继承批准或改变旧key/旧Hasher。

## 精确候选ownership（fresh正式登记后实施）

A：packages/protocol/src/review.ts（request/version/snapshot response及cancelDTO）；events.ts仅新增cancelled enum；core/src/ports/storage.ts；modules/review/src/request-service.ts新与模块index.ts薄export；core/src/services/idempotency-service.ts、event-service.ts（实际threadfilter）、必要新review-request-records.ts（真实metadata/ref重构，无canonicalizer依赖）；core/src/index.ts仅必要helper导出。tests/integration/m6-review-requests.test.ts新（内部真实SQLite服务/幂等/权限/事务）。已接受modules/review材料builder默认保护，真正必要变化先根准。

B：storage-sqlite/src/schema.sql/schema.ts/bootstrap.ts/sqlite-storage.ts/index.ts与scripts/generate-schema.mjs/extract-schema-requirements.mjs/check-schema-sync.mjs实际生成接点；offline-upgrade.ts/offline-backup.ts/directory-state.ts/operational-status.ts仅版本/维护必要点。protocol/src/export.ts/export-decoder.ts；core/src/services/space-export-service.ts与ports/space-export-snapshot.ts；storage space-export-snapshot.ts/logical-import.ts；client/src/export-stream.ts；cli/src/index.ts只原offline映射。tests/integration/m6-schema3-maintenance.test.ts新及tests/fixtures/historical-v2-schema.sql与historical-v2-schema.README.md新（只完整当前DDL精确原字节/hash/recipe，不创建TS副本）；既有fixture修改需根逐条授权。

共享StoragePort仅A写，B先发精确SQL method接口需求；core index仅A、storage index仅B；protocol index现wildcard无需并改。A不用SQL/维护源，B不改review DTO/idem/service/events enum。D独立tests/integration/m6-review-requests-independent.test.ts与maintenance独验、verification/四gate；所有新路径fresh先登记，避免抢源。task本身不授额外文件，必要缺口先报根。

## 验收与精确旧测试授权边界

真实SQLite：fresh资格/unsupported政策/贡献排除/组与真实membership；申请原子snapshot/items/headv1/固定assignment；current ACL/材料保密/坏snapshot/hash；固定版本replay/cancel/version/事件计数及撤权；真rollback/重开/同key与不同key并发round。真实blank/v1/v2→3分类/serve拒旧；copy源不写/故障rollback；backup2stage升级/backup3完整恢复；逻辑1兼容和2正式excluded/source身份隔离/空正式表。首失败保，独验统一gate，不预填通过。

根已定型View/items/domain错误与module边界，无待确认字段。B只获准以下九个旧测试的必要current/schema/export期望及fixture同步，全部原业务/失败断言保持：

- tests/integration/m0-m1-r4-b-regression.test.ts
- tests/integration/m3-backup-recovery.test.ts
- tests/integration/m3-upgrade-independent.test.ts
- tests/integration/m3-space-export.test.ts
- tests/integration/m3-logical-import.test.ts
- tests/integration/m3-import-independent.test.ts
- tests/contracts/m3-backup-cli.test.ts
- tests/contracts/m3-offline-upgrade-contract.test.ts
- tests/contracts/m3-space-export-contract.test.ts

来源核查见[B精确清单与生成维护事实](m6-persistence-boundaries.md)（ff58e2993d4f17ee98789028818448bcbc13080e2bf2f5f712115ea5dbd9ac84）；上述授权不是全局替换。v1 runtime/SQL/TS、m3-export-worker旧wire1、m0-r3 legacy分类、operations/readworker migration2恢复、post/thread/relation业务revision2/3与未证必改quota/order测试全保护。旧Y04原证据保留。

## 新serve/init公开维护行为取舍

现实旧serve/init会原地自动v1→2，不能假称旧行为一直拒legacy。新schema3 ordinary serve/init均仅接受current3重开，blank仅init初始化；合法legacy1或2拒绝并给现安全错误与显式 `detuned migrate` 指引。集中bootstrap.ts的openAndCoordinateDatabase两mode guard，不在CLI重复规则；library buildApp本来不迁移。低层bootstrapDatabase仅给明确owned stage/新实例迁移调用。新测试核原source保留与migrate提示，不削旧原反例。

B生成器将currentSQL→V3、独立完整historical-v2SQL→V2；结构profile不是可执行DDL替身。restore先sourceprofile+inventory验证，stage2受控bootstrap3/identityreset/target3验证，copy升级1|2同理。旧2backup不改source manifest，新3backup写3。此行为变化需下包实际维护文档/示例与正式验证，当前任务书不标通过。
