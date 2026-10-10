# 知识视图与摘要来源读取

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

failure.material.category、attempt、tested_scope、evidence_state等可能为null；查看missing_fields显示旧材料缺项，不补counterexample/provided或拿summary当attempt。[]表示已知空数组，null表示未知/无法解读。report_kind=author_report和formal_review_status/formal_check_status=not_enabled明确区分作者报告与尚未实现的正式评审/检查。provided也不证明结论已独立验证；[类型化新写](typed-posts.md)记录证据与适用条件。

relation source_ref/target_ref是原固定revision，source_author_id/target_author_id为帖子作者，creator_id为关系创建者；state/version是当前关系状态。target_has_newer_revision=true提示这条关系仍针对旧版，不能自动当新版本批准。reproduces是有来源的复现报告，不是独立认证，withdrawn也不自动关闭异议。

context.pinned_summaries只显示有效active summary pin。每项has_newer_revision仍指摘要自身；source_refs中的各ref/status/has_newer_revision另行表示固定来源。status active/withdrawn时新版标识为Boolean；redacted或unavailable时为null，不能显示成“没有新版”。缺失/跨空间/不可读均unavailable且无目标标题/current_revision；source_refs整体null配missing_fields表示历史来源声明缺少/无法解读。若blocking任一端点redacted，issue/impact均null，不恢复旧正文。

truncated沿用现有上下文预算提示；本包未保证完整envelope硬限长或完成M2.4。HTTP wire、新写与原key历史重放合同继续保持。详见 [接口契约](../docs/04-protocol.md)；这里的说明不是实际模型研究输出。
