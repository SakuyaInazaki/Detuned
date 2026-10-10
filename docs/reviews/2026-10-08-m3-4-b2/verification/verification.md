# M3.4-B.2 独立验收

状态：父已于2026-10-08接受上述有限范围。实际验收日期 2026-10-08，限定标准 serve 的整体关闭预算、buildApp 的资源追踪与等待、异步资源所有权、真实 FD 释放与严格锁释放，以及 M3 T02/T13 出口。未更新全局当前状态。

最终 fullsuite 517/517 项、67/67 文件，新正式 17 项（A6+B4+C停机5+M3出口2）包含于总数。唯一 workspace build、typecheck、lint、fullsuite 均 exit0。`pnpm test` 与 `test:all` 实际均运行 `vitest run`。current29 为四门禁 + 24 原保留探针 + A.1 第11项批准适配，29/29；原第11项未重跑，旧默认高量 seed 失败证据保留。命令、真实时间戳与各 stdout/stderr 见 [commands.json](commands.json)。

首轮四新文件 15/17：C poll 输入 wait_ms30000 超现协议25000，HTTP校验在业务屏障前拒绝；T13 把未 pin 的 note 当作 context 材料，现 context 仅收指定 summary/failure/challenge。父批准只修两个前置：poll25000、T13用合法 summary 与无敏感标记来源，并真实 HTTP PATCH pin revision1。原九个可见正例及全部脱敏断言保持，增加固定路径编号诊断。两失败 case 定向2pass/5skip，随后最终全套整体通过；没有产品修改或重构建。首原始日志与 [归因](first-targeted-classification.json)、[修后冻结](c-fixture-correction-freeze.json) 保留，不能将首失败改写为成功或产品回归。

## 真实资源与退出

四路实际 HTTP poll/export/partial multipart/download 在受控私有屏障上同时 active4，再发 SIGTERM 和重复 SIGINT。标准关闭先同步全部 cancel，后 app.close 完整 finally/idle，后 db.close，后 strict lock release；最终 exit0、active0、实际一个 FDclose、begin仅一次、锁不存在、无 observed unhandled rejection。慢 export 与 download 为 test-only wrapper，multipart 是真实未结束输入，不称所有情况自然慢盘。

实际 file publish 已完成、core事务尚未进入时持屏障，signal后 DB与锁仍在、active1，绝无提前 DB close。放行后本次实际**完整提交**：artifact/event/idempotency 各+1、object1、staging0，再退出0。现 core 不保证信号撤回所有在途写，本测试没有新增取消业务规则或模糊把 commit/cleanup任一结果填作通过。

晚 open 在关闭期间返回真实 handle，从未 firstNext（0）亦 dispose1、实际 FDclosed1，再释放 lease；metadata exists 的真实 await 也被整个 lease 覆盖。持有不结束 lease 的1000ms预算退出1，未提前调用 db.close/lock.releaseStrict；随后进程退出由OS回收FD；随后真实 built CLI 启动恢复 owned stale锁及孤儿文件，health成功，SIGTERM正常退出0、锁消失。

受控 app/db/strictlock失败与 uncertain backend disposer rejection 均退出1，安全诊断不传原异常（reportFailure零参数），后续不安全阶段不执行。disposer拒绝分支 active仍1、FD释放未确认、不提前DB/锁。库调用 app.close 本身没有任意 backend 的自有硬deadline；标准 CLI 预算非零退出，自定义宿主必须提供预算。原生同步 SQLite/FS 不能硬抢占，单调预算在阶段返回后复核。父接受保守 lease 策略，不能宣称所有异常都优雅资源释放。

## M3 出口

T02 使用真实十个 HTTP 请求，各已到服务端私有屏障再一起放行，未由 sharedclient合并；十个201业务响应一致，唯一post/revision/event/idempotency，改正文同key409且无额外行。该屏障只共同起点，不声称同步 SQLite事务并行。

T13 同一标记先经合法 summary/pin，在当前、revision1、不可变revision页、revision列表、context、FTS、短query LIKE、附件内容、export九路真实可见；附件metadata亦可读。显式 HTTP 分别脱敏 post 与 artifact 后所有出口无标记，FTS/LIKE均空，post原key201为脱敏投影、附件原key410。审计两target分开，post受影响revision精确[1,2]，artifact target独立正确；B1白名单日志无标记。无敏感来源副本，未将 M6 not_enabled 当作 M3阻塞或虚报正式评审。

## 完整性与范围

[完整性记录](integrity.json)：HEAD保持 b8dacd56779a007a2e7045b682bca0c036fdfc44；4374旧review文件（含B1整个包）、4 SQL/archive、2schema、5mutable全部原哈希。A12/B9最终冻结均匹配，228 source/config/test文件仅授权ownership delta，最终208 tracked/160 untracked dist。最终 gate窗口 source与docs无变化。owned worker/CLI PID与私有fixture目录残留0，无广泛kill；新包99有限文本 known-token pattern无匹配，不泛称所有研究内容脱敏。实际 build产生dist变化，如实保留。

fullsuite继承既有40MiB export一次：640行、正文41943040bytes、wire42399852bytes；receiver50/server10采样仅佐证，不证明硬RSS。没有额外40MiB/600秒/模型/四宿主/多平台/介质灾难验证。A、B互审无未决阻断：[A→B](../implementation/core/transport-cross-review.md)、[B→A](../implementation/transport/core-cross-review.md)。作者source A新6+旧适配15共21一次通过，B source3+built1待项由本轮真实built验收关闭，作者开发补项次数仍见原报告不合成一次。
