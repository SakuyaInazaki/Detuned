# Check CLI与普通工具（M7.1-B2）

当前验收状态见[进度](../docs/progress.md)与[审查索引](../docs/reviews/README.md)。schema6不迁移。以下ID是原始ID，CLI/client负责URL编码。JSON文件须填真实请求、固定snapshot、当前版本及已授权verifier；不SQL伪造正式状态。`detuned --url "$BASE_URL" --token-file "$ORDINARY_TOKEN_FILE" --json`为普通角色前缀，verify命令换成`$VERIFY_TOKEN_FILE`。token文件仅本地私有，不提交或写日志；普通空间owner/maintainer权限由core判断，既有admin虚拟owner仍仅无membership且allowed_scope允许时适用。

## 十二命令

| 命令（接上述前缀） | 输入/结果 |
|---|---|
| `check create "$SPACE" --input create.json --request-key create-1` | 创建run；返回真实id/hash/version |
| `check read "$SPACE" "$RUN"` | 当前可读run |
| `check snapshot "$SPACE" "$RUN"` | 固定manifest，客户端实际JCS SHA校验 |
| `check post "$SPACE" "$RUN" "$POST" 1` | 固定post revision；无前导零正safe整数 |
| `check credential "$SPACE" "$RUN" --input credential.json` | 普通owner/maintainer一次明文；无key/自动retry |
| `check receipt-submit "$SPACE" "$RUN" --input receipt.json --request-key receipt-1` | 绑定verify真实完整回执 |
| `check receipt "$SPACE" "$RUN"` | 已提交真实回执 |
| `check invalidate "$SPACE" "$RUN" --input invalidate.json --request-key invalidate-1` | 普通owner/maintainer失效当前版本 |
| `check artifact-upload "$SPACE" "$RUN" local-check.log --mime text/plain --request-key log-1` | verify bounded日志，空metadata |
| `check artifact "$SPACE" "$RUN" "$ARTIFACT"` | scoped metadata，非文件字节 |
| `check artifact-download "$SPACE" "$RUN" "$ARTIFACT" --output new-private-log.bin` | SHA/MIME/EOF验证后0600新文件，不覆盖；stdout仅摘要 |
| `check required "$SPACE" "$REQUEST"` | 普通read最新required目录，最多32，缺run=null |

`--input`省略则读stdin JSON；例如`cat create.json | detuned --url "$BASE_URL" --token-file "$ORDINARY_TOKEN_FILE" --json check create "$SPACE" --request-key create-1`。所有命令stdout保持现JSON风格，issuer成功token只显示一次，不保存到ledger或key文件。下面模板必须替换真实值；版本不能猜测。

create.json：

```json
{"request_id":"真实请求ID","snapshot_id":"固定snapshotID","check_name":"冻结profile名","verifier_id":"已授权actorID","expected_request_version":1}
```

credential.json（默认ttl3600，范围60..86400）：

```json
{"ttl_seconds":3600}
```

receipt.json：hash来自真实run，日志ID来自该run真实ready上传；时间是实际执行时间，pass要求exit_code0。

```json
{"receipt_id":"local-receipt-1","observed_snapshot_sha256":"替换为run的64位小写hash","observed_check_config_sha256":"替换为run的64位小写hash","result":"pass","environment":"实际环境","execution_steps":"实际固定步骤","tool_versions":{"checker":"实际版本"},"started_at":"2026-10-10T01:00:00Z","finished_at":"2026-10-10T01:00:01Z","exit_code":0,"logs_artifact_id":"真实ready日志ID"}
```

invalidate.json：

```json
{"expected_version":2,"reason":"真实失效原因"}
```

create/invalidate可换用`--request-key-dir "$PRIVATE_KEY_DIR" --logical-operation-id stable-intent`成对持久选项，不能同时显式key（含JSON request_key）；同意图/目标保持key，不同目标隔离。receipt-submit支持JSON request_key或命令选项，沿既有显式键优先级；无键则客户端每调用生成key、重试同key。verify receipt-submit/artifact-upload对持久flag的**任何出现**（含空字符串、半pair）都在读input/file/token/HTTP前拒绝；不会getMe。credential拒任何key选项，无key/retry0；JSON未知key本地拒，不能声称无需读取JSON即发现。下载复用安全原子发布与signal/finally，不覆盖已有文件；HTTP示例见[check HTTP](check-http.md)。

## 现九工具内的两写六读

仍只有九工具名字。普通`forum_review`新增两分支，explicit request_key必填：

```json
{"space_id":"s","op":"check_create","request_key":"create-1","request_id":"r","snapshot_id":"snap","check_name":"local","verifier_id":"v","expected_request_version":1}
```

```json
{"space_id":"s","op":"check_invalidate","request_key":"invalidate-1","run_id":"run","expected_version":2,"reason":"真实失效原因"}
```

普通`forum_read`六精确选择器：

```json
{"space_id":"s","kind":"check_run","id":"run"}
```

```json
{"space_id":"s","kind":"check_snapshot","id":"run"}
```

```json
{"space_id":"s","kind":"check_post_revision","run_id":"run","id":"post","revision":1}
```

```json
{"space_id":"s","kind":"check_receipt","id":"run"}
```

```json
{"space_id":"s","kind":"required_checks","id":"request"}
```

```json
{"space_id":"s","kind":"check_artifact","run_id":"run","id":"artifact"}
```

所有分支strict额外字段；新read不接受cursor/max_bytes/limit/file/path/URL/content，check_artifact只metadata。issuer、verify-only receipt/log写及binary下载不进普通工具。flat输入直接这些对象，wrapped输入为`{"input":上述对象}`且outer不得有额外字段；Pi广告原样canonical schema。reason完整x-max-codepoints上限500保留，canonical validator按真实Unicode码点计数，500emoji合法、501在binding.prepare前拒；SDK忽略扩展处由canonical validator补足，不改SDK配置，不用UTF16 maxLength。普通prepare仍capabilities/getMe/session，不放宽verify。固定Pi公共SDK与本地MCP回归不代表四native宿主/profile/模型已认证。
