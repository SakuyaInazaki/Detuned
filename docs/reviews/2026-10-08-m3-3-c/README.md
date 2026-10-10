# M3.3-C 受控旧实例复制升级与回退验收

2026-10-08 完成有限本机工程验证，**父已接受（2026-10-08）**。新增本地 `migrate --offline`，仅支持schema1源，保持原主DB、现存WAL和登记附件字节，只在新副本迁移schema2并撤旧凭据、换secret、发独立humanadmin。来源actor禁用状态/membership/session/研究/idempotency/pending保持，原实例用匹配旧runtime与原外部secret回退，不提供通用逆迁移。

实际最终 **449/449、54/54**，新增13项含总数（A6+B3+C4），current29 **29/29**。workspace build/typecheck/lint/fullsuite各一次，25保留探针各一次。首次新targeted8/13、随后C3/4均保原失败：B完整缓存历史[1,2]期待错误、C误用CLI名/FK夹具冲突、无WAL坏库readonly新空WAL协调边界澄清；必要修正B+C7/7。产品未因这些夹具失败改动或重build，不称所有首次通过。

真实固定旧提交fa1b35c运行时在独立进程创建HTTP研究历史；固定child提交后精确kill/reap留下真实非空WAL、无活writer，维护后原DB/WAL/objects逐字节保持。新服务同原actor新token正常API、旧cursor409、新pending同batch新cursorACK成功和普通写成功；原schema1+旧runtime+原secret回退读取、原oldcursor实际ACK和新写成功。ready附件实际bytes/hash可下载，但旧source附件仅明确directSQL登记/profile，不冒称旧HTTP上传。

完整旧create/patch缓存回填[1,2]；另明确人工移除一个creation缓存、保研究的边界保持[2]，current export→logicalimport成功且thread.history_complete=false，不伪造历史。仅thread允许缺历史，space/post仍完整。原DDL/schema2、current2 backup-format、serve/init行为、旧B2归档未改。

原无WAL时SQLite readonly可留下正规0-byte WAL协调文件，不能称源目录零写；原有WAL不改删，不允许新非空WAL/业务文件。合作锁不防恶意绕锁writer，同步SQLite不能硬抢占；post-unlink双失败目标完整但durability未确认、可能可启动，准确告知不要使用、保原实例另新目录重做。

[独立验收](verification/verification.md) · [机器结果](verification/final-results.json) · [实际命令](verification/commands.json) · [完整性](verification/integrity.json) · [清理](verification/cleanup.json) · [冻结契约](planning/frozen-contract.md) · [A交付](implementation/storage/README.md) · [B交付](implementation/transport/README.md) · [下一任务](next-task.md)。

保护全部旧review3887、SQL/archive4、schema2、HEAD原字节，最终197source/config/tests门禁窗口稳定，dist仅唯一build正常变化。核心无模型/网络推理，未额外40MiB实验/600秒负载/四宿主/任意旧版本与介质认证；已有40MiB case随唯一fullsuite一次，有限heap样本不构成硬RSS保证。完整M3.4/M3及M6/M7未完成。

用户入口：[升级与回退指南](../../../examples/upgrade-recovery.md) · [当前功能状态](../../progress.md#当前功能状态与未完成能力)。下一 [M3.4-A 统一写入限流、资源限额与显式配置](next-task.md)按持续授权自动推进；完整 M3 与后续尚未完成。
