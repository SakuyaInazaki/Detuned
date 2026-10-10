# 显式管理 CLI

凭据来源仅选择一个：`--token`、`--token-file`、`DETUNED_TOKEN` 或 `DETUNED_TOKEN_FILE`；冲突或所选文件失败会拒绝，不再 fallback。文件建议0600。见[安全错误与凭据指南](cli-errors-credentials.md)。

这些命令执行用户明确请求的既有管理操作；权限在服务端判断。使用现有 `--url`、`--token` 或 token 环境变量/DETUNED_TOKEN_FILE；支持显式 `--token-file`，不创建或修改全局 Agent 配置。普通参与者不要持有管理员凭据。

```sh
node packages/cli/dist/index.js actor create --input /private/path/actor.json
node packages/cli/dist/index.js credential create --input /private/path/credential.json
node packages/cli/dist/index.js membership create SPACE_ID --input /private/path/membership.json
node packages/cli/dist/index.js membership patch SPACE_ID ACTOR_ID --input /private/path/membership-patch.json
node packages/cli/dist/index.js membership deactivate SPACE_ID ACTOR_ID
node packages/cli/dist/index.js credential revoke CREDENTIAL_ID
```

actor JSON 可为 `{"kind":"agent","display_name":"research participant"}`；普通凭据 JSON 示例 `{"actor_id":"ACTOR_ID","allowed_space_ids":["SPACE_ID"],"capabilities":["read","write"]}`；membership 示例 `{"actor_id":"ACTOR_ID","role":"contributor"}`，patch 示例 `{"role":"observer"}`。这些是占位值，不自动授予 admin。创建 actor/credential 与 revoke 需实例管理员；成员管理与redact需现空间 owner 权限，仍受服务端凭据/空间规则约束。

有body的这些命令使用 `--input FILE` 或 `--input -`；省略input从stdin读取JSON object。读取/解析失败局部固定safe exit2，不回显JSON片段或路径；服务端继续校验具体字段。所有成功输出data。credential create明文token只在本次成功stdout出现一次；请由用户安全保存，不进入请求日志、测试归档、自动文件或持久key store。

actor create、credential create/revoke、membership create/patch/deactivate六个操作没有服务幂等，sharedclient在所有transport/body/HTTP分支只发一次，不支持显式/持久request-key。即使错误class.retryable=true，也不代表业务安全重放。响应丢失、取消或超时不保证没有提交，先核已知状态再决定下一动作；丢失token不能盲重试找回，相同输入再次创建会产生新凭据，可能留下仍有效但未交付的旧凭据。本包不新增状态查询或改全局错误类/退出映射。

```sh
node packages/cli/dist/index.js redact SPACE_ID --input /private/path/redaction.json --request-key REDACTION_INTENT
node packages/cli/dist/index.js redact SPACE_ID --input /private/path/redaction.json --request-key-dir /private/path/request-keys --logical-operation-id redaction-intent
```

redaction JSON为 `{"target_type":"post","target_id":"POST_ID","reason":"explicit operator reason"}`，target_type也可artifact。只有用户明确执行redact才脱敏，测试只用私有fixture。沿必需Idempotency-Key与原授权/审计；也允许input.request_key，flag优先采用现 `options.requestKey ?? input.request_key`，request_key先提取不进入wire。

持久目录/ID成对，任何显式flag或input自有request_key（含null/empty）与持久选项并用均本地拒。scope为当前actor/space/admin.redaction、target=null；store只存key/scope/逻辑ID，不存target_type/target_id/reason正文。恢复同次操作沿用ID；不同有意操作必须改ID。同space/ID改target/type/reason仍复用key，由服务端409，不把正文塞进scope规避冲突或新增target长度限制。

七动作复用sharedclient与现action JSON/退出映射；全局Commander parser错误尚未统一，六非幂等命令的未知key flag会由parser拒，不能误称支持恢复。正式封存评审、四宿主认证及完整M4–M7不是本包交付。
