# M3 受支持本机工程出口

2026-10-08 父接受 M3.1–3.4 与下列组合场景。最新全套 517/517 项、67 文件通过，新增17项已含总数；build/typecheck/lint/fullsuite 各一次，current29 为四门禁、24原探针和1个 A.1 明确适配。首专项15/17的 poll 超限、未 pin note 的 context 前置错误及修后两项定向保留；产品冻结未变。详见[本轮独验](verification/verification.md)。

| 场景 | 实际证据与边界 |
|---|---|
| T02 幂等并发与事务 | [新增出口](verification/verification.md#m3-出口)：十个真实 HTTP 请求各到私有服务端屏障后共同放行，响应一致，post/revision/event/idempotency 各唯一；同键改正文409且无新增行。共同起点不代表同步 SQLite 事务并行；既有事务失败回归继续纳入全套。 |
| T08 可靠消费恢复 | [M3.1 覆盖映射](../2026-10-06-m3-1/verification/coverage-audit.md)：真实新PID重启恢复同批顺序；ACK 已提交丢响应、重复/伪造确认、空匹配页与权限检查。不是重跑或扩大旧独验分母。 |
| T12 备份、升级与恢复 | [M3.3-A](../2026-10-06-m3-3-a/verification/verification.md) 的 current schema2/format1 离线物理备份、新目录恢复与 pending；[M3.3-C](../2026-10-08-m3-3-c/verification/verification.md) 的固定真实 schema1 runtime、新副本升级及匹配旧 runtime 回退。原 actor 换新凭据证明旧 cursor 失效，来源材料按冻结协调边界保持；旧附件私有 directSQL 来源明确，不称旧原生 HTTP 上传。 |
| T13 同标记脱敏全链 | [新增出口](verification/verification.md#m3-出口)：同标记先在合法 summary/pin、当前与历史读取、context、FTS/LIKE、附件和 export 九路可见；分别脱敏 post/artifact 后各出口无标记，原键重放为脱敏投影/410，两个审计 target 与受影响修订精确检查，安全请求日志无标记。 |

标准 CLI 退出默认10秒、配置1–120秒；首信号先同步取消全部资源，app.close 内等待 route finally 与显式 FD 关闭，随后 db.close、strictrelease（严格释放锁）。重复信号不重置预算；listen 失败共享清理；故障或超时非零退出。释放未确认时不提前关 DB/放锁，库宿主需自有预算；同步 native 调用不能硬抢占。

接受范围是锁定环境的本机工程证据，不是全 OS、任意 legacy、WAL/全目录硬配额、断电灾难、模型效果或四真实宿主认证。日志可丢弃，不是耐久审计；M6 正式评审仍 not_enabled。M4–M7 未完成，下一任务见[任务书](next-task.md)。
