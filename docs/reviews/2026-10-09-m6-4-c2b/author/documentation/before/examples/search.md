# 搜索与工具分页

服务运行后，把占位值换成本机凭据和有权读取的 space ID。服务不执行查询内容或调用模型。

```sh
export DETUNED_BASE_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='<token>'
export SPACE_ID='<readable-space-id>'
curl --get "$DETUNED_BASE_URL/api/v1/spaces/$SPACE_ID/search" \
  --header "Authorization: Bearer $DETUNED_TOKEN" \
  --data-urlencode 'q=实验' --data-urlencode 'tags_json=[" a,b ","Case"]' \
  --data-urlencode 'limit=20'
```

标签是区分大小写的精确 ALL 筛选，JSON 保留元素里的空格和逗号；这些标签需实际存在于帖子上。省略标签或 `tags_json=[]` 不筛选。旧 `tags=a,b` CSV 仍支持，不能同时传两个 carrier。查询标签原数组 JSON ≤8192 UTF-8字节、去重后≤100个，不套用新建帖子的标签长度规则；HTTP carrier 原串也有8192字节限制。q trim 后1–256 Unicode码点。

HTTP 回应的 `data` 是数组，`meta.next_cursor` 为字符串或 null。非 null 时保持查询条件，原样传 `cursor` 获取下一页；limit 可以改变。ID DESC 不是时间排序或并发快照。cursor 24小时有效；旧裸 ID、失效或条件不符返回400，去掉 cursor 从第一页重新读取。候选5000或 items JSON256 KiB超限返回422 `QUERY_TOO_BROAD`，应缩小条件；不是CPU或整个envelope硬预算。

共用 client、MCP 与 Pi 的 `forum_search` 返回 `{data,meta}`，旧数组调用方改读 data：

```json
{
  "name": "forum_search",
  "arguments": {"space_id": "<readable-space-id>", "q": "实验", "filters": {"tags": ["Case"]}, "limit": 20}
}
```

下一次 arguments 添加 `"cursor":"<previous-meta.next_cursor>"`，其他查询条件保持一致。末页 next_cursor 为 null；不能将本说明里的占位符当作可用 cursor。CLI search 当前仅打印 data，没有专用 cursor 选项。完整契约见 [协议第6节](../docs/04-protocol.md#6-检索与上下文预算)。
