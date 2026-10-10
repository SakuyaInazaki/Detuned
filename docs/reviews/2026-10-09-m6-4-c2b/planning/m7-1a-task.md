# M7.1-A 内部检查回执闭环与 schema6 维护任务候选

status: root_approved_pending_c2b_seal_m7_fresh_capture_dispatch

仅 planning；本候选不授予产品写入或运行权限。C2B metadata/seal、M7 fresh 与 root dispatch 后才准实施。A 领域/协议/鉴权/日志/评审事实，B SQLite/生成结构/维护/迁移，D 独立回归与唯一串行运行窗。Web/browser、既有封存与旧三组历史 fixtures 保护。无需模型、VM、宿主、任意帖子执行、安装、全局配置或推送。

## 功能范围与持久模型

本包实现内部 domain 闭环，不新增 checks HTTP/CLI/tool；M7.1-B 才接公开传输，之后 M7.2/D01。后端 WebSessionService 阻止受限凭据换普通会话属于鉴权修复，无前端工作。

schema6 四类正式表：check_runs、check_run_versions、check_receipts、check_run_credentials，不加第五类。run 固定 request_id/snapshot_id/check_name/verifier_actor_id/config hash；attempt 按(request,check_name)单调递增。version history 重建创建/receipt/invalidate过去状态；状态/event/幂等同事务。receipt每run唯一、receipt_id全局唯一，客户端ASCII[A-Za-z0-9._:-]非空≤128；跨run冲突不泄漏其他run/space；receipt不可变。

create输入 request_id+snapshot_id+check_name+verifier_id+expected_request_version，两ID严格绑定，不能snapshot反查猜request。仅 collecting/revealed 且当前材料/政策、profile允许active actor创建。事务推进request.version，保持phase/count、reason=null；run持久记录创建前request version供并发审计，不作为未来receipt/finalize身份。绑定固定request/snapshot/config。创建run/history、request新版、event、幂等同事务。选择最大attempt，终态request不创建新run；重评新round。receipt/invalidate只推进run.version，保现终态request/decision约束。

## 受限鉴权与日志

credentials增加stored capability verify；只能['verify']、exact单space、非null expiry，并有immutable credential→run绑定。一般CreateCredentialRequest仍只read/write/admin，不得签verify。内部专用签发仅当前maintainer/owner且具read/write；verifier来自固定run，不由caller任填。ttl默认3600、60..86400；同run新签撤旧run token，不动actor其他token，明文只返回一次、存hash，无幂等自动重试。混caps、缺失/矛盾绑定fail closed，前缀不作安全机制。

Auth刷新绑定/expiry/revoke/actor；verify expiry<=now拒绝，普通凭据时间契约不变。verify禁止普通space/list/me/post/search/poll/export/admin/private-review/Websession；generic空间权限先拒verify，GET spaces/getMe等绕过requireSpaceAccess的业务路径补共享core门禁（必要仅spaces路由接点）。不靠membership赋普通read/write，不因同actor而看本人sealed。指定run授权仅metadata、固定snapshot与manifest明确纳入的固定post/公共artifact、run日志、自己的receipt。

ArtifactService复用bounded stream/stage/hash/publish/配额/当前授权/幂等/cleanup，新增run专用authorize/create/read；visibility=space，server设check_run_id和owner，client不填绑定。仅pending+active request新upload/newreceipt；读取/原key重放按当前scope/privacy，不强求pending。receipt日志必须同space/run/verifier且新流程登记ready。unused日志不是receipt。普通ArtifactMetadata不必扩，来源核持久record。固定snapshot/config/实际身份逐次核；红删不能借manifest重放泄漏。

## 回执、聚合与历史

receipt完善现字段：observed hashes64小写hex且精确匹配；pass/fail/error；environment/tools版本、execution_steps、started_at/finished_at有界明确schema。时间有效ISO、start<=finish，不证明可信时钟。pass exit_code0，fail/error不推断算法真假。同receipt_id同原内容返回原结果、不同冲突；run只终结一次，重跑newattempt。新receipt需pending、request active、当前授权/材料；同key/同receipt重放先当前授权/privacy，再重建历史，不因run terminal误拒。状态pending→pass/fail/error；maintainer显式invalidate任何run，留reason/version/history/receipt，可操作终态request的run，原decision不改。

根确定字段：environment string 1..8000 Unicode码点；execution_steps string 1..16000码点；tool_versions plain string map 1..32项，key 1..128码点、value 1..512码点，均非空且不trim/改写。started_at/finished_at复用既有严格ISO instant，start<=finish。整个原receipt输入JSON编码≤65536 UTF8 bytes含键，超限明确拒绝；canonical白名单、未知key/finite严格。两个observed hash为64lowerhex，pass exit0；tool_versions不能藏于environment。

required frozen checks取每name最大attempt：空→not_required，否则failed优先、再error、再pending，全pass才passed；invalidated作pending且current_validity报check_invalidated。revoke/expiry/disabled actor只阻新操作，不自动否定历史receipt，撤信必须显式invalidate。

finalize保负评优先与OPEN_OBJECTIONS等既有错误优先；allaccept且checks pending/error/invalidated→REVIEW_INCOMPLETE，fail→changes_requested，全pass→accepted。accepted按冻结required顺序保存全部pass receipt IDs；由checkfail得changes_requested保存当时最新failed IDs；原负评决定时[]。intrinsic历史核immutable receipt/run-version及snapshot/config，不因后来invalidate/log红删把决定视结构坏；当前privacy/有效性分层。core status/knowledge与module共享聚合。

current_validity加check_invalidated/check_log_redacted/check_log_unavailable于invalidated理由组，原12相对次序不变、最多15；只查当前required latest及历史decision引用的真实checks。unused日志不影响；metadata日志状态不声称当场磁盘全hash。历史pass保事实、当前invalidated明确；不得泄漏sealed/私有验证数据。

## schema6与维护

schema5→6仅显式离线复制升级；canonical SQL/生成DDL/结构profiles同步，冻结V5来源，bootstrap/backup/restore/offline-upgrade/logical header版本一起更新。物理保正式历史，restore撤credentials/换secret/newadmin，旧verify失效但历史receipt不自动否定。logical formal仍excluded，不扩family；header6兼容/import新6，公开artifact日志不重建可信receipt。

D必须在M7 fresh后、任何产品/schema改写前，以当前已接受built runtime短流程生成真实schema5来源fixture，归档脱密/来源/可重复配方；不用新代码伪造旧来源，不改旧三组fixtures，不触VM/任意旧库。此步骤是写入实施前的时序门禁，由root/D落实。

## 验收与交付

真实SQLite、鉴权、stream：scope越权矩阵、expiry/revoke/rotation、普通路径保护；并发run requestversion/attempt；receipt hash/log来源/冲突/回滚/重启重放；最新覆盖旧pass、error/fail；invalidate/history/privacy；真实5→6备份/恢复/失败原子性。D唯一串行窗口，精确fresh、作者sourcefreeze、交叉审查后门禁。受控契约与真实DB证据分清，未运行不得宣称通过。

所有权JSON只是候选；existing已静态确认，new必须missing且不得创建占位。真实冲突报root，不自主扩线。

## 已核具体实现接点 / 待根确认

- CredentialCapabilitySchema当前被protocol/admin.ts::CreateCredentialRequestSchema直接复用；加入stored verify必须分离通用签发allowlist，并在core/admin-service.ts::createCredential内部防绕过，因此两文件列A候选。不能只改actors.ts让通用接口意外接受verify。
- /spaces列表当前routes/spaces.ts直接storage.listVisibleSpaces，不调用requireSpaceAccess；已列唯一必要route候选，只调用新增core门禁，不实现checks HTTP。
- environment现为string非空无上限，execution_steps同样；上述新增tool_versions与限长按根定稿实现；现无结构化environment对象，不另发明环境类型。

## 签发/重放生命周期补充

verify签发仅run pending + request active且current snapshot合法。旧非selected pending run仍可完成历史receipt，只要request active；最新attempt选择唯一，旧pass不因新pending被采用。终态request拒新receipt/upload；原receipt/日志key重放只当前scope/privacy，不套fresh生命周期门禁。

## 真正V5数据库前置capture

D四个new资产：tests/fixtures/m7-schema5-baseline/database.sqlite、manifest.json、README.md、generate-v5.mjs；先核missing，不创建占位。M7 fresh之后且任何产品/schema改写之前，D用当前接受built runtime短流程生成含正式review/decision与待确认consumer的真实V5库，不SQL伪造formal。种子不创建blob附件。归档必要metadata，去全部有效credentials/secret；D基于实际FK提出无损脱密具体方案经root核准后capture。manifest绑定runtime/schema/hash/命令；常规回归直接复制fixture，不依赖旧Git/tmp/generator。B两个SQL/profile资产保持独占，四DB资产仅D写；capture不在C2B产品执行。

## 旧current-schema机械适配（根批准精确B所有权）

以下静态定位必然受真正current6影响；只改current输出/未知版本反例，保历史source5/旧fixture语义与旧case：

- packages/storage-sqlite/tests/storage.test.ts:254 当前schema.sql反射与V5_SCHEMA_TABLES比较；生成测试schema-generation.test.ts:110/148/179匹配current V5名（已在B候选），241 profile表应保V5并另列V6。
- tests/integration/m3-space-export.test.ts:37 当前服务导出header schema_version5。
- tests/contracts/m3-backup-cli.test.ts:46 当前backup CLI summary schema_version5。
- tests/contracts/m3-offline-upgrade-contract.test.ts:14 current upgrade输出5，source_version1保留。
- tests/integration/m3-upgrade-independent.test.ts:25/45 upgrade输出及MAX(migrations)5。
- tests/integration/m6-schema3-maintenance.test.ts:36/37 source2升级current5、current backup5。
- tests/integration/m6-schema4-maintenance.test.ts:54/63 source3升级current5及currentbackup5；70把header6当非法需换真正unsupported版本，合法历史3/4/5保留。
- tests/integration/m6-schema4-maintenance-independent.test.ts:103 current backup5。
- tests/integration/m6-schema5-maintenance.test.ts:28/42 source4升级输出5、current backup/restore classification max5；46固定source5 header是合法历史，不应机械改。
- tests/integration/m6-schema5-maintenance-independent.test.ts:74 当前backup5（历史fixture与source语义保持）。
- tests/integration/m3-backup-recovery.test.ts:73 manifest mutation schemaVersion6目前当非法，6变合法需替换unsupported版本，不能删负例。

根已批准上述11个额外existing路径归B，schema-generation已在B不重复计。授权scope仅当前target/header5→6、current反射常量V6、原非法未来6→7；保历史input/source/合法header5与原case意图，禁止全仓替换所有5。整个包仍待C2B seal/M7 fresh、真实V5 capture与root dispatch；此规划定稿不授予立即产品写入。

## 根批准的 V5 capture 最终前置门禁

采用 [D 的 V5 capture plan](m7-v5-capture-plan.md)。M7 fresh 后由 D 独占先使用当前接受built runtime生成脱敏真实V5归档；root验收capture前，A/B不得写任何产品/schema。归档去全部credentials/token_secret；保actors/sessions/formal与pending consumer必要事实。secret-free归档不冒称直接可启动：回归先复制，再以rawSQLite只插fresh secret水合目标，之后进入coordinator/维护；不SQL伪造formal状态。具体脱密/FK/来源runtime/manifest按已批准capture plan执行。

D另获现有 `.gitignore` 精确所有权，仅追加 `!tests/fixtures/m7-schema5-baseline/database.sqlite` 单一例外；保留 `*.sqlite-*` 忽略及其它规则，不能泛化允许数据库资产。planning此处仅记授权，不修改.gitignore或生成fixture。
