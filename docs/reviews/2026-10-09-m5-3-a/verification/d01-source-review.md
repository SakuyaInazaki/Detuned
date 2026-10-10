# D01 独立源码互审（B，2026-10-09）

只读审查两冻结脚本，没有运行脚本/VM/tests，也没有改A源码。被审SHA256：`d01-recovery.mjs` = `e248f8c5ca9fb1e259493585f3610e520562752e78b137dfd80e2d24e7642901`；`d01-worker.mjs` = `e80bdf8c9070009a466e12210efda813672d45ad2d8d14d9eb69fe9dbea68138`，均匹配A author/d01/freeze-manifest.json。本审查不是运行证据或完整core安全审查。

## F01：唯一副作用DB oracle不足，需限定声明或补独立验证

recovery:42比较重启后的discover返回同一个improvement.id；:45只`count(*) FROM posts WHERE id=? ==1`。该列为PK，这个查询本身无法排除实现错误时“返回旧结果同时偷偷新增另一post/event/idempotency记录”的反例。脚本未在重放前后对事件/幂等记录数量或全部新增帖数作比较，因而不能单凭这条oracle宣称任务书的“业务、事件、幂等条数无重复”全已验。这不是已发现产品重复写入；具体运行是否重复须D实际DB oracle核定，已通知根。其他两条查询确核pending ack_seq未前移和该artifact关联一条。

## 读码可确认的有限路径

- 真CLI进程：recovery:23、:24 spawn当前Node+真实builtCLI；:40先stop客户端和serve，再同端口启动，明确两PID都不同，不以一个对象重置冒充重启。worker:6–10从builtclient/Nodekey store构造新对象；密钥只通过私有IPC，不在argv/receipt。
- C材料：worker:15–17真实搜索failure、从其证据refs分段读取两固定修订材料，累计1MiB/连续offset检查；父给discover仅space/query（recovery:38、:42），不把原帖正文经IPC交新worker。**worker:18的改进正文是预编程固定模板，documents未参与计算**，因此这是无模型固定旅程/论坛材料接续，不证明从材料推理出算法改进，不能写成盲测科研能力。
- 持久key域：worker:10每代同keys目录，improvement logicalOperationId固定；recovery:40重启同port保持origin，:42重放同space/thread/意图并核响应ID。restore另port没有假称继承原origin的key域，也没有靠换token重建原serversecret。
- pending/ACK：recovery:39创建pending，:40重启后同batch及events，:45查ack_seq仍订阅原值；首ACK只在:47明确执行。restore:48离线新backup/newrestored目录，:49旧token实际UNAUTHENTICATED、为原C actor新限权credential、旧cursor ACK_INVALID、新签cursor不同且同batch/events，最后仅显式ACK。
- fixed refs/summary：:36–37保原提案、材料与failure固定revision；worker:18普通proposal cites原source及failure；:41读original1原错误正文；:43–44用真实summary kind和source_refs、明确非正式。两脚本没有resolve/review/approval调用，不将三点反例错误关闭。summary response未额外DB核全文/来源，运行断言范围不应超过源码现有检查。
- 20进程：:46真实fork20workers，共享C身份，Promise.all并发同显式key后20不同key；不是20独立权限主体，也不是容量认证。22秒补充actor桶后samekey竞争、再2.1秒补充余额；每client10秒、IPC15秒，整smoke<60秒断言，未偷偷调产品rate。:20跟踪全部child；:22 TERM后5秒KILL后等待close，:52 finally并行reap并移除私有目录，180秒watchdog保留。

## 失败边界/未宣称项

stop(:22)不要求exit0；强制SIGKILL也能继续并最终status passed，但receipt保signal。不能把它自动称“全部自然/正常退出”；D必须核真实child收据。tracked(:20)只监听close，不监听child `error`；spawn/fork EAGAIN或IPC通道提前关闭时可能发生未捕获error，逃出普通try/finally清理。正常冻结运行是否触发由D证据决定；本读码未运行这种故障，不据推测宣称发生泄漏。worker正文分段只检查offset/总量，没有单独断言complete，固定小fixture由JSON解析检出截断，但不能扩称所有巨材状态正确。

结论：没有从两脚本读到新增服务端权限/ACK/恢复业务缺陷；F01是实际验收声明与oracle覆盖缺口，等待根/D裁定，不以作者pass替代独立DB核定。其余源码确认仅适用于上述冻结固定无模型旅程及实际运行收据。
