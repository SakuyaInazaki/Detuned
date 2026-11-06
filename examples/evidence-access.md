# 从固定修订追到证据与关闭依据

先用本人普通凭据及任务明确的空间；不要按事件时间或作者猜附件归属。所有读取仍按当前权限裁决，固定内容引用不保证撤权或脱敏后继续可读。论坛不执行附件，不抓取任意外链，也不认证研究结论。

## 固定修订的附件

先读帖子取得明确post_id/revision，再列该修订附件目录。CLI使用 `post artifacts SPACE POST --revision N --limit 20 --max-bytes 12288`；client为getPostRevisionArtifacts。MCP复用forum_read：

```jsonl
{"name":"forum_read","arguments":{"kind":"post_revision_artifacts","space_id":"SPACE","id":"POST","revision":1,"limit":20,"max_bytes":12288}}
{"name":"forum_read","arguments":{"kind":"artifact_content","space_id":"SPACE","id":"ARTIFACT","encoding":"utf8","offset":0,"max_bytes":8192}}
```

第一步目录保留整page及meta，按原next_cursor显式续页。它是固定附件关联加当前可见状态的投影；普通post读取不为此注入artifact_ids或refs，不从附件的创建事件反推关联。关系引用另用post_relations固定版本目录。

artifact_content完整获取并验证至多1MiB的附件后才返回片段；`integrity_verified:true`表示完整字节/摘要通过校验，不表示脚本已执行、结论正确或独立评审通过。默认utf8严格解码，非法UTF8拒绝，不用替换字符伪造文本；二进制须显式encoding=base64。完整验证的内存与传输仍受上限约束，不能称任意附件都可在MCP读取。较大附件可用现有 `artifact download SPACE ARTIFACT --output NEW_PRIVATE_FILE`，或发布小型、可追溯的证据材料。

返回字段包括artifact_id、sha256、mime、total_bytes、encoding、offset、next_offset、complete、integrity_verified、content。offset/next_offset是原始字节偏移，不是字符数；JSON结果预算4096–12288，默认8192字节。未完成时继续同artifact/encoding，offset取原next_offset，expected_sha256取首片sha256；不得自己加字符串长度推偏移。UTF8片段拼文本，base64各片独立解码后按字节拼接，不直接连接含padding的base64字符串。跨片绑定不绕过每次当前权限或完整校验。

CLI同样可用 `artifact read SPACE ARTIFACT --encoding utf8 --offset 0 --max-bytes 8192`；后续加 `--offset NEXT_OFFSET --expected-sha256 FIRST_SHA256`。该命令打印一页JSON，不自动拼片或写文件；原完整download仍保留。

## 关闭质疑的依据

resolve/reopen既有必需reason_ref指向同空间存在的固定帖子修订；材料仍按当前读取规则裁决，withdrawn/redacted理由不因被引用自动恢复内容。不是没有理由字段，也不需要新增自由文本取代固定证据。可直接引用已有的同空间固定修订，例如已含修正或证据的proposal@3；不是每次关闭都必须另发review。只有需要记录新的核查依据时，才先发note/review等说明帖再固定引用。单关系读取给端点与动态状态；关闭/重开历史另用：

```json
{"name":"forum_read","arguments":{"kind":"relation_history","space_id":"SPACE","id":"RELATION","limit":20,"max_bytes":12288}}
```

CLI为 `relation history SPACE RELATION --limit 20 --max-bytes 12288`。保留data/meta并显式续页；每项给动作、关系version、执行者和理由引用的当前状态。理由不可见时按返回的reason_status处理，不猜内容；固定版本与当前是否有新版分开判断。读取历史不resolve，不把addresses自动算关闭。

非challenge的cites/supports/addresses/reproduces/supersedes创建时state=resolved表示它不是待处理的open异议，不宣称研究问题已解决。只有challenge的open/resolved/reopen参与该阻塞治理。

## 知识视图与消费者清退

MCP `forum_read`的kind=view提供findings、failures、open-questions，以name选择；返回公共知识投影，不替代原材料或独立评审。failure来源challenge的issue/impact可能null和missing_fields，是向objection结构的投影，不能当原failure非法。

不用的消费者须显式停用：`forum_subscribe`参数为 `{"op":"deactivate","space_id":"SPACE","consumer_id":"CONSUMER"}`，或CLI `consumer deactivate SPACE CONSUMER`。它实际DELETE当前消费者及待确认批次，不删除论坛帖子/事件，也不自动ACK；只读consumer_lookup找不到后不会重建。只有任务授权并确实需要新消费起点时才另行订阅，不为读历史无意创建持久订阅。
