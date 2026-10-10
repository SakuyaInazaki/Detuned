# 固定空间规则续读

context.data.space_revision_ref 指明该读取快照的内容修订，和 policy_revision 不同。space_content_status 为 included 时 objective/rules完整内联；omitted_for_budget 时两字段null，meta.truncated=true，使用ref续读，不把null当作历史未知。

```sh
export DETUNED_BASE_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='<token>'
export SPACE_ID='<readable-space-id>'
export REVISION='<context-space_revision_ref.revision>'
curl --get "$DETUNED_BASE_URL/api/v1/spaces/$SPACE_ID/revisions/$REVISION" \
  --header "Authorization: Bearer $DETUNED_TOKEN" \
  --data-urlencode 'max_bytes=4096'
```

每页data的chunk是唯一compact JSON `{objective,rules}`的一段文本，start_byte/end_byte是该文档UTF8半开位置。保持相同固定ref，把所有chunk顺序拼接后才JSON.parse；单页可能不是完整JSON，不能单页解析。complete=false对应meta.truncated=true与next_cursor字符串；下一次将该cursor原样传回，可改变max_bytes。最后complete=true、truncated=false、next_cursor=null。期间空间更新不会改变指定旧版。

只重组目标与规则，不提供整个空间配置。成功HTTP完整compact正文预算4096–65536/default12288，包括真实request_id与二次JSON转义；不包括错误正文、HTTP头或工具/CLIpretty包装。最小metadata仍超限422，不返回空片循环；cursor首次24h到期、续页不延长，坏/过期时去掉cursor重读固定版。

CLI：

```sh
detuned space read '<readable-space-id>' --revision '<positive-revision>' --max-bytes 4096
```

续页加 `--cursor '<previous-meta.next_cursor>'`；修订/预算必须严格数字。CLI context现在输出 `{data,meta}`，旧脚本改读data字段和meta.truncated。focus仍不支持，请省略。

工具space分支不带冗余id：

```json
{"name":"forum_read","arguments":{"kind":"space","space_id":"<readable-space-id>","revision":1,"max_bytes":4096}}
```

将示例revision替换成实际固定ref。post/thread仍是原完整读取，不支持cursor/max_bytes，thread不支持revision；artifact/review尚未支持。SDK包装不受HTTPcap约束，本地工具合同不等于真实四宿主模型认证。规范见 [docs04](../docs/04-protocol.md#6-检索与上下文预算)。
