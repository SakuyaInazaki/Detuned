# M6.3 协议/存储现状（2026-10-09，只读）

- `packages/protocol/src/review.ts:6–16` phase已枚举 collecting/revealed/accepted/changes_requested/rejected/stale/cancelled；verdict:18–24 为accept/changes_requested/reject。枚举存在不代表finalize/持续stale已实现。
- `FinalizeReviewRequestSchema`(:93–97)仅严格object的可选expected_phase，未有expected_version、decision结果DTO或状态计算DTO。`tools.ts:210–218` inactive finalize op要求space_id/request_key/request_id及可选expected_phase；:225–234并入inactive review union，非已启用八工具。
- `SubmitCheckReceiptSchema` review.ts:80–91严格字段：receipt_id、observed_snapshot_sha256/observed_check_config_sha256（字符串长度64，未限定hex）、result pass|fail|error、environment非空、execution_steps非空、exit_code integer、logs_artifact_id非空。没有check_name/request_id/session等绑定字段，也没有实际接收服务或存储记录。
- 当前current read是ReviewRequestReadView(:171–174)：base固定roster/版本/快照等+submitted_count、changed_by可null；无独立有效性status实体。普通post kind里decision（posts.ts:17）只是帖子类型，不是正式review决议表。

## 现有实体与缺口

`schema.sql:244–320`正式六表为snapshots/snapshot_items/review_requests/review_request_versions/review_assignments/review_submissions；没有review decision、check run/receipt表。artifact有check_run_id(:146)但没有对应实体/FK，不可当检查已经执行。
`core/ports/storage.ts:77–93`现有snapshot/request/immutable version/assignment/submission CRUD与reveal方法；没有decision CRUD、check-run CRUD或持续有效性扫描接口。modules/review/src/request-service.ts、submission-service.ts现服务仅create/read/cancel、ownassignment/submit/getsubmission，不提供finalize。

## required_checks 来源

`protocol/spaces.ts:7–25` CheckProfile={verifier_actor_ids:string[],config_sha256:length64,description:string}；ReviewPolicy.required_checks:string[]，空间修订携check_profiles(:55)。
`modules/review/src/index.ts:54–67`从请求expected_policy_revision对应固定space revision读policy，required_checks最多32/非空白/去重，并要求每名check有profile、lowerhex config hash、≤128去重verifier IDs；:122固定进manifest。manifest schema review.ts:162–164保固定policy及profiles。这里是配置与快照冻结，不是执行结果；当前不能由缺记录推导pass。

## 若root选单一真实decision表+schema5，明确现落点候选（不决定设计）

- `packages/storage-sqlite/src/schema.sql`、`schema.ts`（生成）、`sqlite-storage.ts`、`bootstrap.ts`；`scripts/generate-schema.mjs`、`check-schema-sync.mjs`（均storage包下）。必须先冻结完整source4 profile/fixture，不能以new5删表冒旧4。
- `packages/storage-sqlite/src/offline-upgrade.ts`当前source1|2|3→4；`offline-backup.ts:15/145/224`manifest version1支持source2|3|4、新备份4，restore仅stage升级；新增5会触有限profile/返回类型/校验分支，不能泛收未来版本。
- `packages/storage-sqlite/src/logical-import.ts`、`protocol/src/export.ts`、`core/services/space-export-service.ts`目前wire2 source3|4/formal excluded，需要root决定新增source5排除边界；不应把decision加入公共10族。相关client export stream/CLI离线schema literal及current fixture需按真实新合同另列before。
- `packages/core/src/ports/storage.ts`需要root选定真实记录的窄端口；`packages/protocol/src/review.ts`与`modules/review/src/`服务及core compact replay/intrinsic路径需要具体合同才能确定新增路径。现未指定decision字段/审批规则/默认检查通过。

未实施、未生成、未运行任何测试/build或维护命令；B v4源码仍冻结。以上只列事实与缺口，不选择M6.3策略，也不为M7预建空表或假检查记录。
