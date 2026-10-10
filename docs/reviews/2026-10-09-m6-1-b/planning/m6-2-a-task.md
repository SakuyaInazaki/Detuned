# M6.2-A：固定身份、封存初评与全员揭示

状态：父冻结方向的实施任务草案；M6.1-B 最终验收及新 fresh baseline 完成前不写下一包源码。测试、构建与 probe 由 D 单一串行窗口执行。低资源设置沿当前包：workspace 并发1，Vitest worker1、文件串行；必要的真实多进程/最后提交竞争仍在单个受控案例内保留，不以串行化替代竞态验收。禁止 VM、Colima、守护新环境、安装、模型调用、全局配置与推送。

## 范围与阶段出口

实现内部固定 assignment 身份、不可修改初评、私有评审附件及最后一份提交触发全员揭示。服务位于 `modules/review`，core 仅提供端口、鉴权、metadata 与 typed idempotency；storage 不包含业务资格策略。HTTP、CLI、MCP、Pi、Web 操作及正式搜索投影留 M6.4；finalize、decision、持久 stale 与当前有效性留 M6.3。本包不等于完整 M6。

## schema4 与维护兼容

先将完整 current schema3 精确冻结为 historical-v3 SQL/profile，再修改 current DDL。`review_assignments` 增加不可变稳定 `id`，保留 `(request_id, reviewer_actor_id)` 唯一约束；新名单通过现 idGen 一次写入，旧3仅在新 stage 回填随机 ID，不改材料 hash、固定名单、历史版本或幂等记录。增加实际使用的 `review_submissions`，request 头及不可变 versions 增加 `submitted_count`，旧3统一为 0。每份 fresh submit 增加 version/count，最后 collecting 转 revealed。保留旧五表历史，不预建 future 空表。

普通 init/serve 拒旧1/2/3，显式 copy 迁移到新4。真实2/3/4备份先按其完整 source profile/inventory 校验，仅 stage 升级，原数据库与备份不变；新备份 format/version1、schema4。逻辑 payload 不变：wire2 仅 source3|4/formal excluded，wire1/source2/not_enabled 保持；拒未来版本与混配。import 目标4，六个 formal 表为空，来源身份禁用与附件 missing 规则保持。

迁移需特别核定顺序：旧3结构校验后先完成 schema4 新列、assignment ID/count 回填，再让依赖新列的 metadata/replay validator 校验旧 review compact refs；不能在新列尚不存在时执行新 validator。保旧 payload/ref 字节。现 cancel 历史 v2 的专用假设须扩展至提交后更高版本，仍按真实不可变取消 version 重放，不把所有历史取消硬编码为2。

## 身份与权限

`getOwnAssignment` 刷新当前鉴权后只返回本人固定身份 `{id, request_id, reviewer_actor_id, snapshot_id, snapshot_sha256}`，不泄 group。actor 只能 human/agent，verifier 不允许。固定 reviewer 可为 observer，但必须是真实 active、reviewer_eligible 成员、本轮固定 assignment，且当前凭据具 write 能力及该 space scope。此为 assignment 专属写许可，不赋予公共帖子或空间的 contributor 权限；read-only 凭据仍403。create request/cancel 的既有 contributor、作者/requester/maintainer 门禁保持。

现 `AuthService.requireSpaceAccess(auth, spaceId, minimumRole)` 将 write 能力与非 observer floor 耦合。A 增加可选第四参数 operation: read|write（省略时完全保持原 floor 推断），assignment 使用 observer + write，复用统一鉴权而非在 review/artifact 复制 ACL；observer+write 后仍单独要求真实成员，不能用虚拟 admin owner 代替评审资格。不设通用 bypass。

## 初评 DTO、封存与重放

严格 Submit DTO 与 inactive ToolReviewSubmit 同源。snapshot hash 为 lowercase hex64；completion_status 仅 complete，拒 provisional。coverage/checks_performed 各非空白原字符串≤16000；pending_requirements/limitations 各≤32项、每项非空白≤2000。accept 必须 pending 为空。evidence_refs≤64，重复拒绝，post revision 为正安全整数；引用限同 space 可读旧修订、space 附件或本人 assignment 的 ready 附件。

independence_statement 为 `{participated_in_material:boolean, exposed_to_other_reviews:boolean, statement:string}`，statement 非空白≤8000，两布尔必须 false，否则400；此声明不证明认知独立。reviewer_session_id 必须真实存在、同 actor/space、created_at≥request.created_at，全库一 session 只能绑定一份初评；不查询不存在的 active 字段。它参与 payload hash，区别诊断 auth.session_id。同 actor 多 session 不产生额外名额。

submit 无 expected_version，以 immutable assignment/snapshot 和事务支持不同 reviewer 并行。same key 重放原固定确认，改 payload409；已提交 assignment 使用另 key 一律400 VALIDATION_ERROR。fresh 事务刷新 credential/space，核真实 active eligible 成员、固定名单/贡献者/冻结 group 不变量；当前强 group 策略还核当前组非空互异，但不改冻结组。材料/政策与 snapshot 不一致、新版、withdrawn、证据不 ready 或旧 hash 返回409 SNAPSHOT_STALE；本包不持久标 stale。历史 same-key 重放仅核当前 ACL/保密性，不因后来的资格、phase 或 policy 改写历史。

隐私优先级沿既有合同：fresh submit、createForReview、getSubmission 及历史 replay 均先核当前 credential/space/材料保密性，404/410 不得被宽泛 SNAPSHOT_STALE 覆盖。红删材料不能从冻结初评或附件返回重新取得明文。仅通过权限与保密性后，才用409 SNAPSHOT_STALE 表达当前 revision/policy/withdrawn/ready 等有效性不符。

保存不可变实际 session、payload、提交时 request_version、时间。稳定确认仅 `{submission_id, request_id, assignment_id, reviewer_actor_id, snapshot_sha256, submitted_at}`，不含之后变化的 revealed_at，typed compact ref 不存全文。每次 submit 的头/version/count、事件及 idem 同事务；最后一次还将所有 submissions.revealed_at 落库并发 public review.revealed，任一故障全部回滚。前面的提交只发 review_assignment 私有事件，不 public 暴露 verdict/session/group。私有事件 type 固定 review.submitted、visibility=review_assignment、object_id=submission_id、actor_id 为真实提交者，只含 metadata；public 最后 review.revealed 绑定 request ID/版本。现 schema 已有 review_assignment visibility，但尚无 review.submitted type，由 A 在 events/必要 port 正式补齐。

getRequest 进度只 count/phase。getSubmission 本人可读自己的初评；其他同 space observer 仅在该 submission.revealed_at 已落时可读，否则404，admin 也不越过封存。取消或 future stale 不公开未揭示意见；已揭示事实不因后续 phase 变化撤回。

## 私有附件

新增内部 `createForReview(auth, space, assignment, …)`，复用现 staged/publish/discard/配额管线，不放宽 public create。仅当前合格固定 reviewer、collecting、未提交可新上传，visibility=review_assignment、assignment id 固定、owner 为真实 actor。新 op `artifact.review.create:<assignmentId>` 与 compact ref 绑定；旧 artifact.create 不得重放私有结果。

getMetadata/getContent 统一 scope 授权：未揭示仅本人 assignment 可读，作者、其他 reviewer、admin404；揭示后仅该 submission.evidence_refs 明确列出的该 assignment 附件开放，闲置附件永不按整轮公开。space 附件旧语义、失败/红删/撤权规则保持。公共 post/ref 绑定 helper 不得放宽成私有附件入口。public search/context/views/events/export/import 不得含 sealed 数据；本包仅 domain getSubmission 与明确附件读取开放 revealed 内容，FTS/界面留 M6.4。

## 文件所有权与 exact-before 候选

以下为父最终收窄候选，不是当前源码编辑许可；fresh 捕获完成后再正式分发，共享文件每个只一个 owner。

- A：`packages/protocol/src/review.ts`、`tools.ts`、必要 `events.ts`；`packages/core/src/ports/storage.ts`、services/auth-service.ts、idempotency-service.ts、review-request-records.ts、必要 event-service/filter 与 core index；`modules/review/src/request-service.ts`、新 submission-service.ts、index；新 review submission/service 正式测试。负责 DTO/资格/封存/事务业务、compact validators、事件安全和现 request 历史读取适配。
- B：storage-sqlite 的 schema.sql/schema.ts/sqlite-storage.ts/bootstrap.ts、两个 schema generator/check 脚本、offline-upgrade/offline-backup/logical-import；protocol export union、core space-export-service、必要 CLI migrate help；core artifact-service.ts 与新窄 review-artifact-access.ts（不与 A 共写 review-record helper）。新 historical-v3 SQL/README、schema4 maintenance 与 private artifact 正式测试。storage index 如需新增导出由 B 独占。
- D：fresh/exact-before、独立 SQLite/多进程/维护/公共保密性测试、统一 build/type/lint/full/current probes 与 final metadata。旧 fixture 仅在真实失败或已核必需语义变化后逐路径由父批准，不批量替换版本数字。

精确 before 至少覆盖上述现有产品文件，以及现 m6-schema3-maintenance、review request/submission 相邻测试和当前维护版本断言路径。historical-v1/v2 SQL、旧 backup2 runtime、wire1历史向量、旧审查原字节保护。新路径需记录 missing；schema4 与业务 post/thread/relation revision4 不可混改。

## 必须对应的验收

真实 SQLite 与多进程最后提交竞争：count/version 正确、唯一一次 reveal、首份封存全入口不泄，最后所有合格空间读者同时可读；故障注入回滚 submission/head/version/event/idem。固定 assignment 与 session 唯一；observer 合格可 submit/私有上传、public post 写仍403，read-only 凭据拒写，verifier/admin虚拟成员不得凑资格。

核取消/后来资格政策变化后的历史 replay、same-key 冲突与另 key 重复提交；admin 猜 ID404、私人附件 op replay 隔离、闲置附件永久私有、红删/撤权/导出投影和事务清理。真实3→4副本源 hash 不变、2/3/4备份恢复及 wire1/source2、wire2/source3|4矩阵。先记录所有首失败，最小修复后只必要复验。所有凭据与材料私有 fixture，无模型、外部 VM 或用户配置。阶段结束报告真实通过/未运行项与限制，再接 M6.3。

## 下一 fresh 的实际路径候选

只读定位所得，需父最终逐组授权；capture 不等于允许任意改动。

- 已有 A 产品：`packages/protocol/src/{review,tools,events}.ts`；`packages/core/src/ports/storage.ts`、`packages/core/src/index.ts`、`packages/core/src/services/{auth-service,idempotency-service,review-request-records,event-service}.ts`；`modules/review/src/{request-service,index}.ts`。私有提交投影如需额外 helper，先列实需路径再批准。
- 已有 B 产品：`packages/storage-sqlite/src/{schema.sql,schema.ts,sqlite-storage.ts,bootstrap.ts,offline-upgrade.ts,offline-backup.ts,logical-import.ts,index.ts}`；`packages/storage-sqlite/scripts/{generate-schema,check-schema-sync}.mjs`；`packages/protocol/src/export.ts`、`packages/core/src/services/{space-export-service,artifact-service}.ts`；`packages/cli/src/index.ts` 仅版本迁移帮助。`artifact-references.ts` 公共 scope 语义受保护，不能借本包放宽。
- 已知版本契约需同步的已有正式测试：`tests/integration/m6-schema3-maintenance.test.ts`（文件可保名、增加真实3/4矩阵）；`packages/storage-sqlite/tests/{schema-generation,storage}.test.ts`（frozen3/current4 profile）；`tests/integration/{m0-m1-r4-b-regression,m3-backup-recovery,m3-space-export,m3-logical-import,m3-import-independent}.test.ts`；`tests/contracts/{m3-backup-cli,m3-offline-upgrade-contract,m3-space-export-contract}.test.ts`。仅 current schema/version 及 future 反例应改，old2/3/source wire fixtures 保留。
- 已有服务测试需按提交后 version/count 和 assignment id 合同必要适配：`tests/integration/m6-review-requests.test.ts`；附件原义回归候选 `tests/integration/m2-artifacts-core.test.ts`，只有实际受影响且父准后才改。D 独立文件 `m6-review-requests-independent.test.ts` 等只由 D 写。`historical-http-replay.test.ts` 旧来源与业务断言受保护，无证据不改。
- 新路径（fresh 应记录 missing）：`tests/fixtures/historical-v3-schema.sql`、`tests/fixtures/historical-v3-schema.README.md`；`modules/review/src/submission-service.ts`；`packages/core/src/services/review-artifact-access.ts`；`tests/integration/m6-review-submissions.test.ts`、`tests/integration/m6-review-private-artifacts.test.ts`、`tests/integration/m6-schema4-maintenance.test.ts`（若维护测试选择沿用既有文件，则不要同时造冗余新文件）；D 独立 submission/privacy/maintenance 文件名由父与 D 冻结。

historical-v1/v2 源、旧备份2闭包和旧审查材料一律保持原字节；source3 冻结必须先于 current4 DDL 编辑。禁止提前创建这些产品或测试空文件，禁止外网发布与模型/VM环境操作。

## schema3 写确认与当前读详情兼容

M6.1-B 的 `ReviewRequestView`、createRequest/cancelRequest 写确认及 compact 历史重放没有 submitted_count。schema4 不得让旧 schema3 key 重放多字段，不重写旧 ref，也不为 count 新造 compact 版本。继续保留现 base 写确认及 replay 的精确形状；当前 getRequest 用独立 `ReviewRequestReadView`/Details extends base 添加 submitted_count，head 与 immutable versions 仍存 count。提交确认继续采用前述固定 ack，无未来 revealed_at。

公开进度仅 count/phase，不公开谁已提交或意见；这不删除原已公开固定 roster。新回归必须以真实 old3 ref 迁移后严格 deepEqual 旧响应为 oracle，并核部分提交后 create/cancel 历史响应不变、当前 read 的独立 count 正确。现 getRequest===create 测试只按获准新增 read 字段区分详情与写确认，不能削弱任何 replay 精确断言。
