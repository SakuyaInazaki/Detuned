# M6.3-A：内部最终决定、持续材料失效与当前有效性

状态：root已定任务方向，尚未实施；必须等待M6.2-A整包接受、最终封存与D fresh/exact-before READY。HTTP/CLI/MCP/Pi/Web正式动作及检索投影留M6.4；check run/receipt实际业务与存储留M7。无模型、VM、外部部署、安装或全局配置。

## 实施合同

1. schema5只新增实际使用review_decisions与反向查询snapshot_items/必要request phase索引，不造check空表。先冻结完整current4 SQL/profile与真实原runtime；copy1|2|3|4→新5，physical真2|3|4|5按源profile验证后仅stage升级，wire2有限source3|4|5/formal excluded，wire1/source2保留。旧header/compacts/确认/源与backup字节不改。
2. Finalize DTO严格只required expected_version正safeint，替换未公开expected_phase；inactive tool复用但不启用。requester或maintainer/owner、当前write/contributor如cancel。currentACL/privacy始终优先；samekey replay先于fresh version检查，新keyterminal400、version错409。
3. immutable decision/request唯一：id/request_id/actor_id/snapshot_sha256/review_ids[]/check_receipt_ids[]/outcome/rationale/created_at，再加request_version绑定真实新version。outcome accepted|changes_requested|rejected；rationale服务器事实生成，不接自由请求文本。确认仅immutable decision，无动态validity。compact review.request.finalize:<id>绑定decision/request/version/snapshot、不存全文；状态/version/decision/event/key同tx，维护intrinsic与在线privacy分离。
4. fresh finalize同tx重读current材料/policy、全名额complete且revealed、真实当前active eligible human/agent、排冻结贡献者/强group；再按verdict/openchallenges/checks判定。reject优先，次changes_requested。全accept且policy不允许openchallenges时OPEN_OBJECTIONS维持revealed。仅required_checks=[]能accepted；nonempty无真实run为verification_status=pending，全accept finalize REVIEW_INCOMPLETE，不假pass。负verdict仍可优先形成负decision，本包check_receipt_ids始终空。
5. 持续stale仅冻结manifest材料：post revise/withdraw/redact、显式snapshot spaceartifact redaction、有效policy_revision变化；反向items查询同space collecting/revealed请求，在原mutation事务一次stale/version/event。无新独立tx，不改terminal/cancelled历史；pinned-only/无关post不影响。历史accepted decision保留。core窄lifecycle helper不得import module。
6. getStatus最小request_id/snapshot_id/phase/verification_status/current_validity/validity_reasons，当前space read。metadata可在public冻结材料红删后安全报告invalidated；getRequest/getSnapshot/replay410不放宽。实时validity优先invalidated>superseded>challenged>current，保全部有限reason codes：withdrawn/redacted/unavailable invalidated，target/dependency新版或有效policy改变superseded，openchallenges challenged。current不代表accepted。sealed不评估/透露private evidence健康或谁提交；revealed后已公开明确evidence可影响validity/finalize，unused附件不影响。后来的资格/离开不自动改历史decision，freshfinalize仍查资格。
7. 内部getDecision(auth,spaceId,requestId)供当前合格space读者读取唯一immutabledecision，未决404；仍核currentACL/材料privacy，红删可410。与仅安全metadata的getStatus明确分离。
8. review.stale/review.finalized均public metadata事件，object_id=requestId、revision=新requestVersion、actor为实际公开材料变更者或finalizer；无private提交者/正文/意见预览，沿现review事件thread过滤。持续stale仅manifest公共材料，未揭示private evidence变更不得触public stale事件。
9. cancel扩collecting/revealed，保revealed_at、不公开sealed；stale/terminal新cancel拒绝。历史key始终原确认。
10. openchallenges匹配冻结target/dependency的post对象，不按revision过滤逃避旧异议；addresses/作者回应不自动resolve。复用现resolve权限与来源记录，不执行附件，不引入新自动解决机制。

## 真实现有 relation 接点

StoragePort storage.ts:149–165：create/update/findRelation、findRelationByEndpoints(space,sourcePost,sourceRevision,targetPost,targetRevision,type)、listRelationsByTarget(space,targetPost)、listOpenChallenges(space,targetPost?,targetRevision?)、listOpenChallengesForThread(space,thread,limit)、create/findRelationResolution/ByVersion。对象级旧异议查询应省略targetRevision。
protocol/relations.ts:23–35 Relation字段id/space/source_post_id+revision/target_post_id+revision/type/state/version/creator_id/created_at；resolution:45起id/relation_id/version/resolver_id/reason_ref/action/created_at。RelationService.resolveChallenge:141起已有同tx version校验与同space理由修订存在；:234–249权限为原异议作者或非被挑战作者的maintainer/owner。新包复用真实open/resolved与记录，不能把addresses当resolve。

## 文件所有权与精确before候选（最终由root收窄）

A：protocol/src/review.ts、tools.ts、events.ts；core/src/ports/storage.ts、services/idempotency-service.ts、review-request-records.ts及必要review-submission-records.ts、core index；新core/services/review-lifecycle.ts（名字候选）；modules/review/src/request-service.ts、index.ts、新finalization-service.ts/status-service.ts（候选）、相关新正式tests。只在实际需要时新增。
B：storage-sqlite/src/schema.sql/schema.ts/sqlite-storage.ts/bootstrap.ts/offline-upgrade.ts/offline-backup.ts/logical-import.ts/必要index；包scripts/generate-schema.mjs/check-schema-sync.mjs；protocol/export.ts、core/space-export-service.ts；core/services/post-service.ts/space-service.ts/redaction-service.ts真实原mutation hooks；必要CLI既有migration版本映射/client export-stream有限source schema类型。新historical-v4-schema.sql/README、schema5维护与mutation正式tests。现m6-schema3/4-maintenance、schema-generation/storage、现upgrade/backup/export/import current目标断言需先有限盘点与root准精确路径，不批量替换4。
D：旧4真实runtime/oracle、独立finalize/status/stale/privacy/维护case，单执行窗gates与归档。源before先包含以上existing候选；newpaths记录missing，不提前创建空产品。A/B不共写core/protocol/index，跨ownerhelper签名先冻结。

## 验收与执行

真实SQLite/必要多进程验证finalize与revision/challenge串行竞争、故障全回滚、samekey原结果/terminal/version/current资格、无checks正例/required pending/负verdict优先；sealedstatus无意见/人员泄漏、validity全原因与优先级、历史decision原样、pinned/无关材料不stale、红删status安全而材料410；真实source4升级/备份恢复与旧refs确认deepEqual。取消revealed保已公开事实与封存边界。
低资源：所有执行由D串行，workspace concurrency1、Vitest worker1/file串行，保必要case内部真竞态。保首次失败/最小修后受影响复验；既有gate无理由不重跑，具体统一窗口由root指定。

## 最终状态与错误顺序冻结

verification_status完整enum沿docs05为not_required|pending|passed|failed|error。本包实际只产出not_required（required_checks=[]）或pending（非空）；后三种只留真实M7检查事实，不能假赋。
validity_reasons固定顺序去重string[]仅12code：target_redacted、dependency_redacted、artifact_redacted、target_withdrawn、dependency_withdrawn、artifact_unavailable、published_review_evidence_redacted、published_review_evidence_unavailable、target_superseded、dependency_superseded、policy_superseded、open_challenges。前8 invalidated，中3 superseded，末项challenged；全保原因并按此顺序输出，无原因current。
post实体/固定修订缺失、hash/ref绑定损坏属stored corruption，安全RESYNC_REQUIRED，不能伪装current；正常artifact missing/failed属unavailable。仅已revealed_at非null的明确submission evidence红删/withdrawn/非ready可进入两published原因；旧post revision有新版不额外invalidate固定历史证据。unused附件/未揭示意见健康不外露。状态仅已登记metadata，不宣称重新实哈希文件或模型审稿。
fresh finalize顺序：schema→currentACL/privacy/权限→samekey原结果→fresh expected_version不符REVISION_CONFLICT→phase stale SNAPSHOT_STALE→其余terminal/cancelled新keyVALIDATION_ERROR→collecting REVIEW_INCOMPLETE→revealed当前材料、当前reviewer资格（不满足REVIEW_INCOMPLETE）、verdict/objection/check。negative verdict优先open objection/checkpending。docs05及ADR补expected_version优先说明，不改变未实现公开ABI。

未发现其他内部合同矛盾。未实施/未测试/未验。
