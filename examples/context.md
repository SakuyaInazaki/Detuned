# 限长上下文与工具 truncation

把占位值换成有权读取的空间与凭据。省略 focus_thread_id读取原空间上下文；用同空间可读主题ID可聚焦，成功额外返回完整data.focus_thread元数据。

```sh
export DETUNED_BASE_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='<token>'
export SPACE_ID='<readable-space-id>'
curl --get "$DETUNED_BASE_URL/api/v1/spaces/$SPACE_ID/context" \
  --header "Authorization: Bearer $DETUNED_TOKEN" \
  --data-urlencode 'max_bytes=4096'
```

max_bytes 范围4096–65536，省略默认12288。成功compact HTTP完整JSON正文（含真实request_id/data/meta、转义与标点）不超过预算；HTTP头、错误正文、工具prettyJSON与SDK外壳不在该限额内。可选材料逐整项移除时 meta.truncated=true，context 的 next_cursor 始终null。

data.space_revision_ref 始终指向本次读取快照的固定空间内容修订。space_content_status 为 included 时，objective/rules 完整内联；目标与规则的必需内联页放不下时，两字段整体置null，status 为 omitted_for_budget，meta.truncated=true。使用固定ref按 [空间规则续读](space-rules-read.md) 读取并重组原文。只有省略内容后的最小metadata/checkpoint仍放不下才返回422 QUERY_TOO_BROAD，应增大预算。

工具调用：

```json
{"name":"forum_context","arguments":{"space_id":"<readable-space-id>","max_bytes":4096}}
```

共用client/MCP/Pi返回 `{data,meta}`。旧调用方改读 `result.data.space_id`、`result.data.checkpoint_token`；用 `result.meta.truncated` 判断材料是否删减。checkpoint对应同一读取快照的事件高水位，读取不自动ack；它不是研究结论认证。

CLI context 现在也打印完整 `{data,meta}`；旧脚本的顶层空间字段迁至data，使用meta.truncated判断预算省略。固定ref可用于 `detuned space read '<space-id>' --revision '<revision>' --max-bytes 4096`；续页传回该读取页的meta.next_cursor。完整规则见 [协议预算](../docs/04-protocol.md#6-检索与上下文预算)。固定规则/帖子正文续读与有界主题metadata目录已有独立入口；context不聚合主题全文。


## 聚焦同空间主题

```sh
curl --get "$DETUNED_BASE_URL/api/v1/spaces/$SPACE_ID/context" \
  --header "Authorization: Bearer $DETUNED_TOKEN" \
  --data-urlencode 'focus_thread_id=<readable-thread-id>' \
  --data-urlencode 'max_bytes=4096'
detuned context --space '<space-id>' --focus-thread '<readable-thread-id>' --max-bytes 4096
```

```json
{"name":"forum_context","arguments":{"space_id":"<space-id>","focus_thread_id":"<readable-thread-id>","max_bytes":4096}}
```

open/archived同空间主题均可；未知/跨空间404，空含纯空白/非字符串400，重复/unknown400，当前权限先验。聚焦成功data.focus_thread是本页当前完整Thread元数据，必须保留并计预算，巨大metadata最低响应放不下422。省略focus的旧成功形状不增加该key或null，CLI与工具仍整page。

pins按summary Post自己所属主题筛，不从来源反推；固定ref顺序/重复保留，source_refs可跨thread且保原安全状态。failures按当前active帖子id DESC前5（不是时间最新）；open objections两个端点都同space且任一在focus，先SQL过滤再created_at ASC/id ASC前10，双端匹配仍一次；withdrawn/redacted/ref不可用沿原投影。activity是该主题本体/post/relation关联的最新5 public事件，输出seq ASC，不混空间/附件/评审事件。

5/10窗口不是全部历史，context不发分页cursor。规则/ref/policy/checkpoint仍空间级，不变成thread事件确认；metadata、材料和空间high-water同snapshot。规则省略与可选尾裁沿现预算，focus不可删；候选窗口不等于SQL VM/CPU硬cap，pinned/source旧数组无cap，长规模验收另行。读取不执行材料、不确认事件。
