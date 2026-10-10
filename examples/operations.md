# 健康与安全运行日志

```sh
detuned serve --data-dir /private/path/instance
# stderr 默认输出安全请求 NDJSON；可显式关闭：
detuned serve --data-dir /private/path/instance --no-request-logs
curl http://127.0.0.1:3000/api/v1/health/live
curl http://127.0.0.1:3000/api/v1/health/ready
```

匿名 liveness 成功 data 为 `{ "status": "alive" }`，只表明 HTTP 进程响应。readiness 成功为 `ready`；不可用或 draining 返回 503 `SERVICE_NOT_READY`，固定错误与 `{ready:false}`，无路径或数据库细节。这是有限数据库/已配置目录检查，不保证下一次写入成功、磁盘永不满或整个系统健康。preClose 标记 draining、取消可取消活动并等待业务 finally；既有总关闭预算约束退出，失败或超预算非零退出，不提前关DB或释放锁。原生TLS socket在业务完成后清退。关闭中的健康接口不保证仍可达。

管理员通过共享 client `getDiagnostics()` 读取 `/api/v1/admin/diagnostics`，沿既有 token 配置；普通身份拒绝，不分发管理员凭据。统计包含主库页大小/页数/空闲页/最大页数、精确非负十进制 bytes 字符串、文件采样与目录是否配置、全状态登记附件观察数/bytes/完整性。内存应用未配置目录时明确 configured=false/available=null。观察值可能采样后即变化，不是审计快照或来源权限证明。

WAL 的 NOOP 仅观察帧/忙状态，不主动 checkpoint；不可用值为 null，不以 -1 当真实数量。文件采样不返回路径；登记观察最多 10001 个，complete=false 时不是完整总额。页额度不限制 WAL 或全目录硬磁盘用量。

每行请求日志仅固定 method、注册 route 模板、服务生成 request_id、状态或 null、单调 duration、UTC timestamp、完成/中断结果与白名单 error_code；canonical 已认证 actor ID 可选，其他合法历史 ID 省略。没有 raw URL/query/header/body/token、错误文本/details、credential、display name、space ID 或私有评审。客户端不能指定日志 request_id。unknown route 用固定 unknown。

stderr writer 自身最多排队 64 KiB/256 条，每条不超过 1 KiB；背压等待 drain，溢出丢弃，恢复时输出 request_log_dropped 计数摘要。sink 错误隔离，不改变业务结果；stderr 可能在退出时留下部分 NDJSON 行，不保证完整审计或可靠持久交付。默认启动诊断仍可能是原有可读文本，消费者应只将合法 JSON 行作为结构化记录；stdout 和一次凭据输出不混入请求日志。坏 TCP/parser 在进入 HTTP 生命周期前的错误不是全覆盖审计。同步恶意 sink 无法被 JS 抢占，不承诺硬 deadline。

## 有界服务退出

`serve --shutdown-timeout-ms 10000` 默认总预算10秒，允许1000–120000的安全整数；非法值在mkdir/打开数据库前拒绝。首次SIGINT/SIGTERM同步标draining、拒新业务并取消可取消I/O，等待所有upload/poll/metadata/download/export的完整finally与显式资源dispose，随后app.close→数据库关闭→严格释放目录锁。重复信号复用同一任务，不重置或延长预算。匿名健康仅尽力维持最小语义，不保证Fastify closing后仍可连接。

关闭预算保持到严格锁释放完成；任何阶段失败或超时固定无敏感诊断、非零退出，不提前放锁或关闭DB留下继续mutation。未确认资源释放（例如download dispose拒绝）时保留活动登记，由标准CLI预算退出；重启沿已有stale锁与上传孤儿恢复。同步native/SQLite不能被JS计时器硬抢占，超时在事件循环恢复后检查，不是硬CPU截止。

库宿主直接使用buildApp/app.close需自有关闭预算，不能假设任意后端故障下app.close独立有界。日志writer只清理自己的监听，不destroy共享stderr；退出可能丢弃尾日志/留下部分行，不是耐久审计。监听失败和信号共享一个清理路径，阶段失败不会继续数据库/锁清理而伪称成功。

## 运行目录性能索引

标准buildApp/serve在既有main/登记附件quota成功后、请求前为可写current库显式准备保留只读性能索引。原数据库无需该辅件才能通过schema2预检；同名错误拒启动不自动DROP，索引建页FULL以507false失败且回滚、不抬额度。bootstrap/GET/export readonly与离线旧源不隐式建索引。同步native构建不能JS硬抢占；仍不保证WAL/临时/目录总量硬cap。有限本机性能与仍TEMP B-TREE事实见[E2](../docs/reviews/2026-10-09-m5-1-e2/verification/independent-report.md)。

原生HTTPS可成对传`--tls-cert-file`与`--tls-key-file`；TLS Web须HTTPS origin。未握手socket在业务finally之后清退，原总shutdown预算与DB/锁顺序不变。证书续期/公开PKI由部署者处理，详见[Web本地指南](web-local.md)。
