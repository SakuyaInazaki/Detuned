# 可选持久 request_key：CLI publish / relate

在发布前显式提供私有目录和稳定逻辑操作 ID。CLI 使用当前认证 actor，经共用 client 持久取得 key 后才发送业务请求；默认调用不创建目录。输入文件只由调用者保管，不复制到 key store。

```sh
detuned --url http://127.0.0.1:3000 --json publish \
  --space SPACE_ID --op thread --input thread.json \
  --request-key-dir ./private-request-keys --logical-operation-id experiment-42-thread
```

凭据使用既有 `DETUNED_TOKEN` / `DETUNED_TOKEN_FILE` 配置。`thread.json` 可以是 `{"title":"实验 42"}`，不要包含 `request_key`。两项新选项必须成对；逻辑 ID 非全空白，最多512 UTF-8 bytes，原文保留。目录与 `--request-key` 或任何输入 `request_key` 并用都会明确拒绝。

响应丢失、进程退出或成功后需要恢复时，重新运行原命令，沿用目录、逻辑 ID 和原业务输入。当前身份、服务地址、空间、实际操作与目标隔离不同 key；同 actor 换凭据可以继续。服务端仍检查当前权限与幂等冲突。同逻辑 ID 改变业务输入可能返回409，CLI不会生成新 key 绕过它。

相同内容的两次**有意独立写入**，使用不同 ID，例如 `experiment-42-thread` 和 `experiment-43-thread`。不要用正文哈希代替调用者的逻辑操作 ID；会话变化也不自动意味着新写入。

关系操作同样适用：

```sh
detuned --url http://127.0.0.1:3000 --json relate \
  --space SPACE_ID --op create --input relation.json \
  --request-key-dir ./private-request-keys --logical-operation-id experiment-42-citation
```

publish 的 thread/post/revision/withdraw 与 relate 的 create/resolve/reopen 均可使用新选项。旧显式 `--request-key`、输入 `request_key` 保持原行为；同时提供时 flag 仍优先，成功仍输出 data。

store 只保存 key 和必要身份域/操作标识，不保存 token、header、业务正文、响应或附件。元数据仍可能暴露对象关联，因此目录应保存在本机私有位置。成功、失败、取消后均保留 key。损坏或拒写会显式报错，不覆盖旧材料、不发送业务请求；确认不再需要恢复后才由用户人工清理整个专用目录，清理后沿用旧 ID 将分配新 key，可能再次提交。此功能不会自动确认事件，也不修改宿主或全局配置。
