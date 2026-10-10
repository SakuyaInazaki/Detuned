# M6.3 实施前事实（仅 inventory，未实施）

## 当前 private artifact 红删事件

`core/services/redaction-service.ts:105–113` 固定写 `artifact.redacted/object_id=artifact id/revision=1/visibility=public/actor_id/created_at`，不读取artifact visibility来决定事件范围。`event-service.ts:187/197` 的pending重放/新扫描只核事件public；无thread过滤订阅不会核artifact当前范围。因此合法红删未揭示private附件后可公开ID及操作者/时间；已向根/D报候选，未自行修复。SD01事件检查位于红删前，SD02:118真实redaction后只核末位提交拒/状态，不包含publicpoll断言。具体修复/反例留根裁与D执行。

## 已定义但尚未实现的后续状态

- docs/05:7–9区分 `review_status=request.phase`、`verification_status=not_required|pending|passed|failed|error`、`current_validity=current|challenged|superseded|invalidated` +全部validity_reasons。current不是批准。
- docs/05:77–86规定finalize requester/maintainer，事务内重读材料/政策、资格、揭示、开放异议和回执；stale/incomplete/open_objections门禁，reject优先于changes_requested；全满足accepted并不可变decision。
- docs/03:139–141未来decision字段 `id,request_id,actor_id,snapshot_sha256,review_ids[],check_receipt_ids[],outcome,rationale,created_at`。当前protocol/review.ts只有FinalizeReviewRequestSchema `{expected_phase?:ReviewPhase}`，无真实Decision/Validity/检查持久record；SubmitCheckReceipt仍未来DTO。当前schema4实际六formal表不含decisions/check_runs/check_receipts；普通decision帖子仍informal，不能复用为正式结果。

## 同事务真实落点

- PostService修订在现executeIdempotent action内 `createPostRevision(updatedPost,postRev)`（:279）、引用/关系/事件同tx（:320/333）；withdrawPost:362–411在idem tx写lifecycle withdrawn、post.withdrawn。Storage创建revision更新head+历史，不能在外层提前判断后另写。
- SpaceService.patch:154–186按显式objective/rules/review_policy/check_profiles字段推进policy_revision（即使内容同值显式重写），仅pinned_refs修改不推进policy；updateSpace与space.revised同idem tx。此现语义不改变。
- RedactionService:78–113在idem tx复核空间/对象，createRedaction与事件同tx；SQLite createRedaction:1430后清历史帖子正文而保窄hash，artifact改state；M6.1维护intrinsic仍不以在线privacy阻断重开。

## 现有可复用方法与真实缺口

`StoragePort`已有同步transaction/readSnapshot、findReviewSnapshotById/listReviewSnapshotItems、findReviewRequestById/findReviewRequestVersion/updateReviewRequest与submission/assignment读取；snapshot_items PK含snapshot/type/id/revision，artrevision0、rules正revision。现SQLite:1558只按snapshot_id列items；**无按(post/artifact/rules)反向查询snapshot或request的port方法，也无专用反向索引/批量失效方法**。不得把已有正向items误称反向查询能力。

`readReviewSnapshotRecords` 是在线历史privacy+内在绑定，`assertReviewSnapshotCurrent` 是fresh当前材料有限检查，维护void只intrinsic；三者边界不能混为通用skip。历史新revision仍可读旧snapshot，当前检查另stale。当前request版本/head只有collecting/revealed/cancelled实际服务路径；没有持久stale/finalize/decision或当前validity服务。开放challenges/关系可由现relation读取接口核实，但正式快照级阻塞范围、关闭证据和检查资格尚需根冻结，不能由本inventory选择eager/lazy。

本文件只列直接接点与缺口，没有新增方案、DDL、权限策略或测试。没有运行checks/模型/VM/后台环境；当前A v3冻结保持。
