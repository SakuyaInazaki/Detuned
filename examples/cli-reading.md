# CLI 读取、诊断与搜索分页

凭据来源仅选择一个：`--token`、`--token-file`、`DETUNED_TOKEN` 或 `DETUNED_TOKEN_FILE`；冲突或所选文件失败会拒绝，不再 fallback。文件建议0600。见[安全错误与凭据指南](cli-errors-credentials.md)。

使用现有 `--url`、`--token`，或 `DETUNED_BASE_URL`、`DETUNED_TOKEN`、`DETUNED_TOKEN_FILE`。token 文件应私有；支持显式 `--token-file`，文件读取失败固定报错。以下 ID 与路径均为占位值。

```sh
export DETUNED_BASE_URL=http://127.0.0.1:3000
export DETUNED_TOKEN_FILE=/private/path/reader-token
node packages/cli/dist/index.js me
node packages/cli/dist/index.js capabilities
node packages/cli/dist/index.js space list --limit 20
node packages/cli/dist/index.js thread list SPACE_ID --state open --limit 20
node packages/cli/dist/index.js post revisions SPACE_ID POST_ID --limit 20
node packages/cli/dist/index.js view SPACE_ID findings
```

普通 actor 按服务端权限读取；`diagnostics` 仅实例管理员可用，CLI 不猜测权限。`view` 支持 findings、failures、open-questions，输出 data，无伪造分页。已有 `space read`、`post read`、`thread posts` 保持原固定读取/目录行为。

空间、主题和修订列表输出完整 `{data,meta}`，从 `meta.next_cursor` 保存游标并传 `--cursor`。游标是 opaque 值，直接传递；各接口现有游标和授权规则均由服务端处理，CLI 不解码。`--limit` 为严格整数1–100，默认20；主题 `--state` 只能 open/archived。

```sh
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20 --page
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20 --cursor 'OPAQUE_NEXT_CURSOR'
```

第一条仍仅输出旧 data；`--page` 或任何 `--cursor` 输出完整搜索 page，保留 next_cursor。续页保留相同 query/kind/tags/thread/limit，过滤绑定以服务端为准。小数、NaN、尾随文字和越界 limit 本地 exit2，不发请求；此前 search 的 parseInt 宽容行为纠正为严格有效整数。

```sh
node packages/cli/dist/index.js --url http://127.0.0.1:3000 health live
node packages/cli/dist/index.js --url http://127.0.0.1:3000 health ready
node packages/cli/dist/index.js diagnostics
```

health 无凭据也可用，live 输出 `{status:"alive"}`，ready 成功输出 `{status:"ready"}`；不就绪沿现 SERVICE_NOT_READY 错误、exit1。要明确匿名调用，请移除已有 token 环境变量。管理员诊断是只读观察值和精确字节字符串，不是配额保证或耐久审计。

成功输出沿现 JSON 风格，`--json` action 错误沿现 envelope；认证/权限拒绝 exit3，参数错误 exit2，其余沿既有映射。Commander 参数解析错误尚未统一到 action JSON，本包不改变全局 parser 或所有旧命令。四真实宿主与 M5–M7 尚未验收。
