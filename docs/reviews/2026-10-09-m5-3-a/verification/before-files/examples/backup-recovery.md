# 离线物理备份与新目录恢复

本包只支持当前schema2与backup-format v1，不迁移旧库，不覆盖已有目标。目标父目录必须已存在；新目录0700、文件0600。manifest最多8MiB，同时最多10000条登记附件；单附件最多25MiB，清单字节与条目限制同时适用。先停止Detuned服务，再明确执行离线备份：

```sh
detuned --json backup --offline --data-dir ./data --output ./private-backup-2026-10-06
```

SOURCE需要遵循Detuned目录锁的进程全部停止；活跃serve持锁时备份拒绝。锁无法阻挡绕过约定的任意SQLite writer。备份仅收集一致DB与已登记附件，不额外收集logs、staging、本机client-key-store、客户端凭据文件或恢复token。物理DB按内容保存，帖子若包含敏感文本不会由backup自动去除。ready附件必须存在且hash/bytes正确；redacted/missing保留状态与实际存在性，不能被恢复成ready。

物理备份是私有材料：DB凭据哈希和可能仍存在的redacted历史bytes会保留。它不是公开导出或全局擦除结果。备份目录不能直接用于init/serve。

```sh
detuned --json restore --backup ./private-backup-2026-10-06 --data-dir ./restored-data
```

目标必须是不存在的新目录；原目录与备份保留。恢复会校验manifest、文件hash/bytes、DB结构与附件关联，撤销全部旧credentials、轮换签名secret，创建一个新的本地human恢复管理员，保留原actor/session/membership、业务历史与未确认batch。输出一次JSON中的 `data_dir`、`admin_actor_id`、`admin_token`；token敏感，只交本地human保管，不向普通Agent分发、不提交、不记录到日志或全局配置。

```sh
detuned serve --data-dir ./restored-data
```

恢复管理员可经现管理HTTP API给原actor重发普通凭据。旧token失效；即使同actor拿到新凭据，旧签名checkpoint/ack/search/read游标也失效。重新poll可取回原pending并生成有效新游标，不自动ack。恢复不是重新激活旧禁用actor，也不是新业务写入。

半成品目录或父目录incomplete sidecar残留会拒绝启动。失败后优先用验证过的好备份恢复到**另一个新目录**。只在确认无活跃进程且检查/丢弃该次半成品后人工清理；不要盲删marker把半套材料当成功结果。若最后同步与重建门禁均失败，可能留下完整但持久性未确认且未交付管理员token的目标。不要启动该目标，保留好备份并换新目录恢复。

ready后stdout丢失意味着新token可能未被接收，工具不把明文token写盘；可从好备份另建新目录恢复。

备份恢复只能找回备份时点的数据，不能恢复之后的写入。完整迁移、结构化导出/导入和M3.4运维另包；此流程不修改网络、宿主或全局Agent配置。
