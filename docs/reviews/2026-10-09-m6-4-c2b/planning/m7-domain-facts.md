# M7 domain / storage / maintenance facts

2026-10-09，A 有界静态盘点。C2B v2 产品冻结；本次唯一写本文，未运行任何 build/type/test/lint、数据库、迁移或宿主。权限与日志上传的进一步事实见同目录 m7-auth-artifact-facts.md。本文不决定 M7 权限、schema 路线、任务所有权或实施，不声明默认迁移成功。

## 规范与当前 checks 缺口

`docs/03-data-model.md` 规划 check_runs(id/snapshot_id/check_name/attempt/verifier_id/policy_digest/check_config_sha256/state/version)、check_receipts(check_run_id/receipt_id/两个 observed hash/result/environment/logs_artifact_id/received_at)。schema5 的 schema.sql/schema.ts **没有这两个表**；StoragePort/sqlite-storage 没有 run/receipt create/find/list/update、latest attempt 或 attempt 分配接点。现有 snapshot/request/version/decision、artifact 元数据、transaction/readSnapshot、event/幂等基础可以复用，但不是已实现 checks。

`docs/05-review-protocol.md` §7要求创建 run 使用 snapshot_id/check_name/verifier_id/expected_request_version，固定快照 check profile 配置摘要；每新 attempt 递增，最新 attempt 排除旧 pass；终结后不能覆盖、重跑另建 attempt；显式 invalidate 既有回执并留原因使当前验收失效。§7要求开始结束时间、环境/工具版本、执行摘要、exit_code 与先 ready 的绑定日志。`docs/04-protocol.md` 列 check-runs/receipt/invalidate 规划路由，不代表当前已注册实现。

`packages/protocol/src/review.ts` 已预留 CheckRunResultSchema(pass/fail/error) 和 SubmitCheckReceiptSchema（receipt_id、两个 hash、result、environment、execution_steps、exit_code、logs_artifact_id）；没有 run 创建/失效 DTO，开始结束时间或独立工具版本。两个 hash 仅长度64，非十六进制规则。这是早期预留与 §7要求的具体差异，不可把已有 schema 当正式回执验收。

`packages/protocol/src/spaces.ts::CheckProfileSchema` 已有 verifier_actor_ids/config_sha256/description，space_revisions 已存 check_profiles。`packages/core/src/services/review-request-records.ts::readIntrinsicReviewRequestRecords` 校验 snapshot manifest 的 required_checks 规范排序、唯一/最多32及与冻结 check_profiles 名称完全一致，profile 与固定 rules revision 中配置/验证者集合一致；不是读取当前 policy 替换冻结规则。`readReviewSnapshotRecords` 在 intrinsic 基础增加在线 privacy；`assertReviewSnapshotCurrent` 是当前材料/政策门禁。

**request version 与最新 attempt 的未决持久语义：**现规范创建输入 expected_request_version；规划 runs 表没有 request_id/request_version 字段，现代码也没有 run binding。snapshot→request 可由已有 records 读取，但“创建时仅并发校验”还是“run 持久绑定哪一 request version、验收怎样选择该版本的最新 attempt”没有现实现可证明。finalize 后 request version 自增，不能直接假定它等于 run 创建版本。本文只指出缺口，不选择键/版本策略。

## Finalize / status / invalidation / history

- `modules/review/src/finalization-service.ts::finalizeRequest` 原 storage.transaction 内刷新 ACL、校验 requester 或维护权限、executeIdempotent、expected_version、phase revealed、当前快照、评审者资格/独立组、提交 evidence privacy/ready。accepted 且冻结 required_checks 非空直接 REVIEW_INCOMPLETE；没有 pass 聚合。decision、request version、review.finalized event 与幂等引用同事务。非 accepted verdict 聚合可创建正式决定，但不宣称 checks 完成。
- `packages/protocol/src/review.ts::ReviewDecisionRecordSchema` 字段 id/request_id/actor_id/snapshot_sha256/review_ids/check_receipt_ids/outcome/rationale/request_version/created_at；check_receipt_ids 明确 maxItems:0。SQLite review_decisions 已有 check_receipt_ids_json TEXT，sqlite-storage create/find 做 JSON 编解码；字段预留不等于允许非空回执。
- `packages/core/src/services/review-decision-records.ts::readIntrinsicReviewDecision` 明确 check_receipt_ids 长度0、精确键集合、固定 snapshot hash、决定历史 request_version 的 phase/actor/time/submitted_count、正式 submissions 与 verdict 聚合一致；accepted 且 required_checks 非空也 RESYNC_REQUIRED。M7填真实 receipt 必须同时更新这些约束，不能只写 JSON。
- 同文件 ReviewDecisionResultReference 是 typed 幂等定位引用：v1/kind review.decision/decision_id/request_id/request_version/snapshot_id/manifest_sha256，无 receipt IDs。parseReviewDecisionReference 精确键与 operation 校验；validateStoredReviewDecisionReference 绑定 immutable decision。它不是外部检查 receipt，也没有任意扩展字段预留。
- `packages/core/src/services/idempotency-service.ts` parseOperation、result-ref allowlist、extractResultRef、validateResultRefSemantics、reconstructResult 已接 review.request.finalize/review.decision；executeIdempotent 可复用统一事务/内容冲突/重建原则，但没有 check operation family 或 typed reference。现幂等重放重核授权与安全重建，不是返回缓存正文绕过 privacy。
- `packages/core/src/services/review-status-facts.ts::readReviewStatusFacts` 当前冻结 required_checks 为空→not_required，否则 pending；没有 latest attempt/pass/fail/error/invalidated 聚合。`modules/review/src/status-service.ts` 保 refreshed ACL 和 readSnapshot 包裹。知识 findings/failures 调用 core 同一事实函数，未来 checks 更新不能只改 module 而使这些投影滞后。
- `packages/core/src/services/review-lifecycle.ts::markReviewRequestsStale` 在材料 mutation 原事务内，仅对 collecting/revealed 更新 stale/version/event；accepted 等终态保原 outcome。readReviewValidityFacts 将当前 target/dependency/artifact/policy/challenges 与已公开 evidence 状态另算 current_validity；现 reasons 无 check invalidation/verifier失信。
- `modules/review/src/request-service.ts::cancelRequest` 只 collecting/revealed，expected_version、reason/version/event/typed 幂等同事务；不删除历史 snapshot/submission。getDecision→reconstructReviewDecisionView 重核当前 ACL、snapshot/evidence 在线 privacy，合法红删可能阻止内容读取；safe status 仍可显示历史 metadata。cancel/stale 不自动擦除已揭示意见，C2B采用同一现 privacy 约束。没有现 run invalidation 反向定位/更新验收接点。

## 若新增正式表与 schema6：精确维护耦合（条件事实）

| 文件 / 函数 | 当前约束；新当前版本会触及的事实 |
|---|---|
| storage-sqlite/src/schema.sql | canonical schema5 DDL，无 checks表 |
| storage-sqlite/scripts/generate-schema.mjs、extract-schema-requirements.mjs；src/schema.ts | generated DDL/版本 TableRequirement；schema.ts verifyDatabaseStructure 版本联合1..5、V5映射、列/FK/索引结构校验；不能只改SQL |
| storage-sqlite/src/bootstrap.ts::classifyDatabase/applyMigrations/bootstrapDatabase/openAndCoordinateDatabase | known-table集合、blank内容检查表清单、migration marker连贯性与各版本结构分类；applyMigrations当前最后5，原子bootstrap/migrations；在线启动拒supported_legacy并要求显式离线 migrate |
| storage-sqlite/src/offline-upgrade.ts::validateDB/upgradeOffline | 输入legacy1..4、输出schema5；只复制到新私有目标后bootstrap迁移、验结构/FK/integrity、身份reset、发布，源不迁移；schema6需相应支持schema5输入与输出 metadata，不能声称现代码已支持 |
| storage-sqlite/src/offline-backup.ts::BackupManifest/validateDatabase/backupOffline/restoreBackup | manifest支持2..5；backup当前5；restore按manifest对应profile验源，在新target当schemaVersion!=5时bootstrap；数据库物理拷贝保正式历史、附件inventory单独核。新增表和版本必须与profile、版本联合和当前判断一致 |
| offline-backup.ts::resetRestoredIdentity | 保留研究/评审记录，撤销旧credentials、轮换secret、新admin同事务；它没有实现“撤销是否使历史receipt失效”的领域判断，需与root权限裁决区分 |
| storage-sqlite/src/sqlite-storage.ts | 新run/receipt ports的显式SQL/编解码/排序/并发语义尚缺；transaction与readSnapshot基础现成，DDL存在不会自动提供这些能力 |
| core/services/space-export-service.ts；storage-sqlite/src/space-export-snapshot.ts::FAMILIES/SqliteSpaceExportSnapshot | public research固定families只space/revisions/thread/post/relation/artifact，独立file-WAL snapshot，space-visible artifacts；服务header source.schema_version硬编码5，formal review/check status明确excluded |
| protocol/src/export.ts；storage-sqlite/src/logical-import.ts::importSpace | current header允许source schema3/4/5且formal状态excluded；严格kind白名单，import新bootstrap目标，artifact固定visibility space/check_run_id null，ready→missing，无正式checks重建；即使继续excluded，新版本header/decoder/目标bootstrap仍是耦合点 |

物理维护支持正式表保存与公开logical export新增family是两个不同事实：目前logical export明确排除formal数据；新增schema版本不自动授权扩大family或泄露sealed/验证专用数据。以上仅列真实耦合，不形成迁移路线或成功结论。

## 根定包前补充的三个精确事实

1. ReviewStatusViewSchema.verification_status精确not_required/pending/passed/failed/error，无独立ReviewVerificationStatus类型或invalidated枚举。current_validity为invalidated/superseded/challenged/current；reason精确12项就是上文当前材料、公开评审evidence、superseded与open_challenges顺序，max12 unique。
2. sqlite-storage.updateReviewRequest以旧version=新version-1 CAS并写history，允许phase/count不变；reconstructRequestView不查相邻transition，但count按submission.request_version<=历史version验证。collecting/revealed同count推进可成立；accepted/changes_requested/rejected历史version必须等decision.request_version，终态同phase新版本会RESYNC。generic reason string|null，严格读取仅cancelled非空白≤500且version>=2，其他phase必须null；现cancel服务写reason，其余create/submit/finalize/stale为null。根决定run创建仅active推进，receipt/invalidate只run推进，保此终态约束。
3. review_requests.snapshot_id仅FK无UNIQUE；唯一为(space_id,target_post_id,round)。服务create每次新snapshot同事务新request，但DDL不保证snapshot反向一对一；ports只有findReviewRequestById/listPostReviewRequests，无按snapshot查request。根决定create明确request_id+snapshot_id并核绑定，避免歧义。
