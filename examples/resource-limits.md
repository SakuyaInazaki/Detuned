# 服务资源限额

标准 `serve` 默认主数据库 1 GiB、实例登记附件累计 4 GiB、10000 个附件对象。显式设置：

```sh
detuned serve --data-dir /private/path/instance --max-database-bytes 1073741824 --max-artifact-bytes 4294967296 --max-artifact-objects 10000
```

主库配置允许 1 MiB–1 TiB，累计附件允许 1 字节–1 TiB，对象允许 1–10000，均为正安全整数；不能关闭限额。非法参数在目录/数据库打开前拒绝；已有 current 实例材料超过额度则启动拒绝监听，quota 配置与统计不删改研究或权限。提高额度需要操作者明确配置；有效配置后的失败不承诺整个 serve 零字节写，既有 lock/SHM/WAL 协调及 bootstrap/legacy 升级流程边界保持。

每个运行连接重新设置 `main.max_page_count`，按真实页大小向下取整；现有页数超过目标或 pragma 返回不符则拒绝。主库额度包含索引和空闲页，不限制 WAL、SHM、SQLite 临时文件、附件、日志、上传暂存、未登记孤儿或整个目录；长 reader 与重复修改可能令 WAL 超过主库额度。

所有登记附件状态（ready/redacted/missing）都计入实例对象与声明字节额度，重启从实际登记读取，成功幂等重放不重复计费。既有单文件 25 MiB、每空间默认 1 GiB、并发上传约束保持，其原 429 错误不改。新实例额度错误为 `QUOTA_EXCEEDED` 507、`retryable:false`；主库启动额度 scope 为 `database`，附件为 `instance_artifacts`。原生 `SQLITE_FULL` 的 scope 为 `storage`，也可能来自实际介质或临时资源耗尽，不能只靠该错误断言配置额度触发。

共享 client 正常完整解析 507 不自动重试；响应读取或 transport 失败仍沿原有界策略。限流默认 60/20 继续独立生效。

离线 backup/restore/import/migrate 不继承服务运行额度。物理维护仍限 10000 个登记附件、每个 25 MiB、manifest 8 MiB；逻辑导出仍限 512 MiB wire 与 200 万条记录，导入不恢复附件 bytes。维护得到的新实例可能超过运行额度，启动前需显式提高允许范围或妥善处理材料；维护成功不等于任意配置下都能启动。此能力不是全目录硬磁盘配额或完整运维验收。
