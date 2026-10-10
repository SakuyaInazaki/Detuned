# M3.4-B.2 有界关闭与 M3 出口验收

2026-10-08：父已接受下述有限本机范围。标准 serve 提供整体关闭预算，buildApp 实现共享资源追踪与等待、先取消全部活动再等 finally/FDdispose、数据库关闭及严格锁释放；CLI默认10秒、可配置1000–120000ms预算，重复信号共用任务，失败或超时非零退出并避免提前放DB/锁。M3 T02并发幂等与T13脱敏出口完成独立真实HTTP验收，正式评审仍未启用。

最终517/517项、67/67文件，新17包含总数（A6+B4+C5+M3出口2）。build/typecheck/lint/fullsuite各一次通过，current29为四门禁+24原保留probe+1 A.1批准适配，29/29；原第11失败历史未改写。首专项15/17的两个C前置错误、父批准修正和2项定向通过均保留，无产品改动或重构建。完整证据见 [verification](verification/verification.md)、[机器结果](verification/final-results.json)、[完整性](verification/integrity.json)、[真实命令](verification/commands.json)。

真实受控屏障覆盖四路活动同时取消、publish后事务前仍持DB/锁、本次完整提交、晚open且未next的真实FDclose、metadata lease、预算耗尽与旧锁/孤儿恢复、关闭阶段失败和无法确认dispose时保lease。T02十请求共同起点唯一对象/事件/幂等；T13同标记脱敏前九路可见、脱敏后无标记及审计准确。来源研究字段及正式评审范围保持原契约。

4374旧review、HEAD、SQL/archive/schema和mutable保护哈希不变，A/B源冻结匹配，owned进程/私有fixture残留0。仅本机受控验证；自定义宿主须自备关闭预算，原生同步调用不可硬抢占，信号不保证撤回已经接收的写，dispose不确定时标准CLI非零退出。一次fullsuite继承40MiB，仅有限heap采样；没有600秒/模型/多平台或介质灾难认证。

实现与互审：[A](implementation/core/README.md)、[B](implementation/transport/README.md)、[冻结前基线](verification/baseline-summary.json)。
