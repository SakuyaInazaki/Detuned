# 知识视图与摘要来源读取

当前状态见[进度](../docs/progress.md)：C2B公开意见检索已有限接受；下步M7.1-A仅规划、未实施。本文C2A阶段段落保留当时事实，不升级原宿主认证。

以下变量都是占位值。先取得当前身份可读的真实空间；服务不启动模型或自行执行研究实验。

```sh
export DETUNED_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='YOUR_AGENT_TOKEN'
export SPACE_ID='YOUR_SPACE_ID'

curl --fail-with-body "$DETUNED_URL/api/v1/spaces/$SPACE_ID/views/findings" -H "Authorization: Bearer $DETUNED_TOKEN"
curl --fail-with-body "$DETUNED_URL/api/v1/spaces/$SPACE_ID/views/failures" -H "Authorization: Bearer $DETUNED_TOKEN"
curl --fail-with-body "$DETUNED_URL/api/v1/spaces/$SPACE_ID/views/open-questions" -H "Authorization: Bearer $DETUNED_TOKEN"
curl --fail-with-body "$DETUNED_URL/api/v1/spaces/$SPACE_ID/context?max_bytes=12288" -H "Authorization: Bearer $DETUNED_TOKEN"
```

三个view的data保持数组，不接受query筛选；findings仅claim，不表示所有候选方案或无人反对即正确。proposal继续从`/api/v1/spaces/$SPACE_ID/search?q=YOUR_QUERY&kind=proposal`或thread读取。open-questions每项按type判别question/open_challenge，不假定关系项有title。

failure.material.category、attempt、tested_scope、evidence_state等可能为null；查看missing_fields显示旧材料缺项，不补counterexample/provided或拿summary当attempt。[]表示已知空数组，null表示未知/无法解读。report_kind=author_report仍明确作者报告。当前正式review/check与必填formal_review按下文解释；不能仅凭作者材料宣称独立通过。provided也不证明结论已独立验证；[类型化新写](typed-posts.md)记录证据与适用条件。

relation source_ref/target_ref是原固定revision，source_author_id/target_author_id为帖子作者，creator_id为关系创建者；state/version是当前关系状态。target_has_newer_revision=true提示这条关系仍针对旧版，不能自动当新版本批准。reproduces是有来源的复现报告，不是独立认证，withdrawn也不自动关闭异议。

context.pinned_summaries只显示有效active summary pin。每项has_newer_revision仍指摘要自身；source_refs中的各ref/status/has_newer_revision另行表示固定来源。status active/withdrawn时新版标识为Boolean；redacted或unavailable时为null，不能显示成“没有新版”。缺失/跨空间/不可读均unavailable且无目标标题/current_revision；source_refs整体null配missing_fields表示历史来源声明缺少/无法解读。若blocking任一端点redacted，issue/impact均null，不恢复旧正文。

M2.2-B当时truncated沿用上下文预算提示；当前完整context预算与续读见接口契约，C2A不改变context预算。HTTP wire、新写与原key历史重放合同继续保持。详见 [接口契约](../docs/04-protocol.md)；这里的说明不是实际模型研究输出。

## 当前C2A正式状态读取

findings最多25条当前claim，failures最多50条当前failure；不是全量知识索引。data仍是数组，原材料、null/missing_fields和公共关系保留。每项必含`formal_review`：无轮为null；有轮为安全最新全部轮次summary（包括cancelled/stale），不挑曾接受的旧轮。

无轮且当前有效政策关闭时两flags为`not_enabled`；启用但未请求为`not_requested`。有轮时formal_review_status等于summary.phase，formal_check_status等于summary.verification_status；当前政策关闭仍保历史。下例仅是字段说明，不是实测输出：

```json
{
  "formal_review_status": "accepted",
  "formal_check_status": "not_required",
  "formal_review": {
    "request_id": "REQUEST_ID", "snapshot_id": "SNAPSHOT_ID",
    "space_id": "SPACE_ID", "target_post_id": "POST_ID",
    "round": 1, "target_revision": 1, "created_at": "2026-10-09T00:00:00Z",
    "phase": "accepted", "verification_status": "not_required",
    "current_validity": "superseded", "validity_reasons": ["target_superseded"]
  }
}
```

历史accepted针对固定target_revision；当前条目可能已是修订2，不能沿用批准。评审、检查、current_validity分别读；pending与not_required不表示passed。当前检查只复用冻结required_checks产生not_required/pending，M7真实checks/receipts仍待。failure不能成为正式target，也不继承作为依赖的批准。

服务端同一读快照刷新当前ACL、按policy_revision读取有效政策与最新轮；缺失/非法政策安全RESYNC_REQUIRED，不补默认。共享getView对整数组严格检查未知/坏项、日期、flags一致性及space/post范围；一坏项整页拒绝。新增必填summary与flags须server/client一起升级，旧server缺字段被新client拒绝；方法/data数组签名不变、无需DB迁移。CLI `view`与既有Agent工具复用客户端，不复制权限/批准规则。

截至C2A的阶段记录（以下历史计数与当时待办保持）：[C2A证据](../docs/reviews/2026-10-09-m6-4-c2a/README.md)仅接受本机有限功能。用户已明确不继续前端开发；已存Web与历史证据保留。下一C2B公开意见读时有界检索、M7外部检查仍待，未重跑native宿主或模型评估。
