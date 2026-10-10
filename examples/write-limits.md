# 写入限流与显式服务配置

默认每 actor 每分钟补充 60 次写入、突发容量 20；不能关闭。服务使用同一个进程内 actor meter，同一身份不同凭据/入口共享，不按会话另开额度。可显式调整：

```sh
detuned serve --data-dir /path/to/instance --write-rate-per-minute 120 --write-burst 40
```

省略两项取默认；每项可独立覆盖。rate 允许 1–60000、burst 允许 1–10000 的十进制正安全整数，未知配置字段/小数/非法值拒绝。CLI 在 mkdir、目录锁、数据库或监听之前验证，错误不回显输入（不要在这些参数粘贴凭据）。不新增 JSON/global配置，不读业务环境变量，已有附件参数保持。

fresh 显式业务写按 actor 计费，幂等成功重放免扣；读取、poll、ACK 和内部维护不扣。空间/对象授权在 admission 前优先拒绝；payload 引用、生命周期等后续业务校验仍可能在 admission 后失败，已扣不退。手动组装 core 时必须显式共享同一 WriteRateLimiter；独立构造服务/实例的默认 limiter 不承诺跨实例计费。

耗尽返回 RATE_LIMITED 429、retryable=true，合规 details 为 `{scope:'actor'|'instance',retry_after_seconds:正安全整数}`，范围 1–600000，HTTP Retry-After 为同值整数秒。原 poll/export/upload 的既有429与附件配额行为不变，只有带上述合规 rate details 的错误加新header。共享 JSON client 沿现有重试/取消/超时规则：maxRetryAfterMs 默认 120 秒，是单次 Retry-After 的接受上限；整请求 timeout 默认 30 秒，maxRetries 默认 3。接受 Retry-After 不表示默认请求能等待 120 秒，整请求超时/取消仍会中止；超过单次接受上限不继续自动重试。exportSpace 流仍不自动重试。

meter 在进程重启时重置；这是节流，不是耐久存储 quota 或跨进程全局账本。固定 actor 状态容量限制可返回 instance scope，不泄漏其它身份数量或内容。M3.4-A.2 耐久资源配额紧接，完整运维、四真实宿主认证、模型收益验证尚未完成。

时钟倒退时，Retry-After 包含追平已观察时间高水位与余额恢复所需时间；极端倒退最多给出 600000 秒的重新检查间隔，不保证该时刻一定可写，也不会因提示上限补充余额。
