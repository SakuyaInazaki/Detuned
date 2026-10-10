# 附件 CLI：有界上传与完整校验下载

凭据来源仅选择一个：`--token`、`--token-file`、`DETUNED_TOKEN` 或 `DETUNED_TOKEN_FILE`；冲突或所选文件失败会拒绝，不再 fallback。文件建议0600。见[安全错误与凭据指南](cli-errors-credentials.md)。

使用现有 `--url`、`--token` 或 `DETUNED_BASE_URL`、`DETUNED_TOKEN`、`DETUNED_TOKEN_FILE`；支持显式 `--token-file`。以下 ID 和私有路径均为占位值。权限、可见性、配额、幂等与脱敏由服务端处理。

```sh
export DETUNED_BASE_URL=http://127.0.0.1:3000
export DETUNED_TOKEN_FILE=/private/path/actor-token
node packages/cli/dist/index.js artifact upload SPACE_ID /private/path/evidence.bin --mime application/octet-stream --request-key WRITE_INTENT
node packages/cli/dist/index.js artifact metadata SPACE_ID ARTIFACT_ID
node packages/cli/dist/index.js artifact download SPACE_ID ARTIFACT_ID --output /private/path/new-evidence.bin
```

upload/metadata 输出公开 ArtifactMetadata JSON，不含服务端 storage_key。download 仅输出 `{artifact_id,sha256,bytes,mime}`，不输出二进制或本地绝对路径。默认及 `--json` 成功均沿现 JSON 风格；action 错误/退出映射保持，Commander parser 错误尚未全局统一。

输入必须是普通非软链文件，末段 O_NOFOLLOW/O_NONBLOCK 打开后在同一 FD 检查并最多读取25MiB+1以拒超限；零字节允许。先复制成有界不可变 Blob 再发网络请求，不是对并发修改文件的原子快照。检查明显size/mtime变化，但不能保证捕获所有并发修改。25MiB是协议上界，服务可配置更低限制；客户端并非无缓存或完整流式API。

省略 `--mime` 默认 application/octet-stream，显式空值、非ASCII或控制字符在本地安全拒绝，避免 Blob 静默丢弃 type。普通ASCII小写归一可用，MIME合法性与允许范围仍由服务端裁决，不猜扩展名。

```sh
node packages/cli/dist/index.js artifact upload SPACE_ID /private/path/evidence.bin --request-key-dir /private/path/request-keys --logical-operation-id evidence-intent
```

持久目录与 logical-operation-id 必须成对，不能与任何显式 request-key 并用；沿现当前actor/空间/操作scope，客户端完成持久key准备后发业务请求。恢复同一次写使用同一ID；有意新写改ID。读取新文件内容会形成新的Blob，同key不同内容仍由服务端拒409，不能借重试覆盖不同材料。上传的不可变体允许sharedclient沿现有界策略重试，每次重建FormData；store不保存正文或凭据。

下载总预算从metadata开始沿client默认30秒，校验固定content路径的headers、精确bytes、SHA256及EOF后才返回；不跟随metadata.content_url抓取外部地址，不跨部分正文拼接重试。SIGINT/SIGTERM中止请求并走失败清理。

目标父目录须已存在。CLI用同目录随机0600临时文件、完整写/fsync/close、hardlink无覆盖发布、同步父目录；已有文件/软链/目录均拒，竞争由link保证不覆盖。失败仅清自己临时文件。若发布已成功但末次同步或完成确认失败，完整final保留、命令非零；检查目标，不将失败当成功或盲删其他文件。没有实例marker。

新附件上传/元数据 JSON 响应采用本地1MiB有界 reader，完整EOF后解析，覆盖取消、reader释放及迟到清理；沿既有 envelope/error/retry，其他旧 JSON 方法不改变。日期有效性复用仓库已锁定的 MIT 库 ajv-formats 3.0.1 full date-time validator，protocol新增该直接依赖；本地离线、ignore-scripts链接，不新增依赖版本或网络获取，不改变原schema或全局FormatRegistry。
