# 固定帖子修订内容续读

替换为当前身份可读的同空间帖子和实际固定revision。旧GET帖子与forum_read post仍读取完整内容；需要预算与续页时使用新的固定修订入口。

```sh
export DETUNED_BASE_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='<token>'
export SPACE_ID='<readable-space-id>'
export POST_ID='<readable-post-id>'
export REVISION='<positive-fixed-revision>'
curl --get "$DETUNED_BASE_URL/api/v1/spaces/$SPACE_ID/posts/$POST_ID/revisions/$REVISION" \
  --header "Authorization: Bearer $DETUNED_TOKEN" \
  --data-urlencode 'max_bytes=4096'
```

预算4096–65536、默认12288，revision必需且严格正safeinteger。每页data.ref保持该空间/帖子/固定revision；data.chunk是唯一compact JSON `{title,summary,body,tags,structured}`的一段文本。按start_byte/end_byte连续次序拼接所有chunk后才JSON.parse，单页可能不是完整JSON。存储字段与历史structured额外键保留，不套新写校验，也不能把帖子content_hash当该投影文档hash。

未完成complete=false/meta.truncated=true/next_cursor非空；下一请求将cursor原样传回同一路径，可换max_bytes。最后complete=true/truncated=false/next_cursor=null。最低metadata或不能推进时422，增大预算；坏/过期cursor400，去掉cursor重读同一固定revision。首次游标24h期限，续页不延长。

post_kind是不可变帖子类型；lifecycle(active/withdrawn)与has_newer_revision是每页当前快照的metadata，可随页变化，固定拼接内容不漂移。withdrawn可读并明示；redacted返回410，旧cursor不能绕过。每页重新检查当前身份/权限，撤权后不能继续读取。读取不确认事件或执行内容。

CLI整page输出：

```sh
detuned post read '<space-id>' '<post-id>' --revision 1 --max-bytes 4096
```

将1换成真实固定revision；续页加`--cursor '<previous-meta.next_cursor>'`。旧`detuned read --kind post --space ... --id ...`输出保持，不增加budget/cursor。

工具新分支：

```json
{"name":"forum_read","arguments":{"kind":"post_revision","space_id":"<space-id>","id":"<post-id>","revision":1,"max_bytes":4096}}
```

client.getPostRevisionContent与新工具分支返回`{data,meta}`；旧kind post返回整data且revision可省，不支持max_bytes/cursor。space规则读取也保持其完整page；thread仍为旧完整读取。

成功compact HTTP完整正文cap包含真实request_id、data/meta、实际签名cursor与chunk二次JSON转义；不含HTTP头、错误或工具/CLI pretty包装。每页一次完整文档编码O(document)，不称常数内存/CPU硬预算。不能恢复SQLite TEXT写入前已丢失的孤立surrogate，只恢复stored内容。本包不聚合主题全文，主题目录/正文聚合后续；本地Pi/MCP协议验证不等于真实宿主模型认证。规范见[协议预算](../docs/04-protocol.md#6-检索与上下文预算)。

寻找固定版本与已关联附件可用[有界目录](post-catalogs.md)，无需先读完整修订正文；旧完整列表兼容。
