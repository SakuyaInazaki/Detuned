# M3.4-B.1 独立验收（2026-10-08）

状态：父已于2026-10-08接受有限安全日志、健康点提示与实例管理员运行统计范围。最终500/500项、63/63文件通过；新增15=A6+B4+C5已含总数。current29组合29/29：build/typecheck/lint/fullsuite四门禁+24原保留probe+已批准A.1第11adapter，不重跑或改称旧原命令成功。

## 实际门禁与首失败

唯一workspace build、typecheck、lint、fullsuite各exit0。首三新file14/15：A6/B4/C4通过，C日志oracle误写已注册路径参数名:thread_id，真实模板是src/routes/posts.ts的:id。仅父批准一个期望字面值纠正，验证恰为固定登记模板而非rawpath，定向1pass4skip；无产品修改/no rebuild，其余新专项不重复。首日志及纠正hash保留，完整suite所有正式通过，无unhandled/MaxListeners警告。

作者真实首记录分类：B source sandboxEPERM为环境；随后漏接真实client.getDiagnostics方法3/4是开发期产品接口接线缺陷，修后4/4，不能弱化为fixture。A合并期间noEmit的protocol generic/error code/log state类型错误为开发期真实编译问题，B修正后A最终source noEmit0，两原失败保留。A6formal仅一次6/6。源码冻结哈希匹配见final-freeze-check.json。

## C五独立真实场景

固定server/client/writer子进程，无任意SQL、shell或函数执行面；tokens仅IPC内存、fail diff不打印完整成功stdout。

- body/header/query/未知rawpath/无效payload的私有marker均不进结构化日志，admin token不进入日志，伪x-request-id不能替换服务ID；精确post登记route模板、unknown回退、字段白名单、真实status与非负monotonic duration核验。
- test-only onRequest→partial HTTP body→destroy→sink terminal私有IPC屏障，真实断TCP而非mock；abort未发header status=null与完整health200各只有一个终态，不用sleep推断。
- 匿名精确live/ready正常；未知后缀/有query拒。只本私有fixture目录rename/restore与迁移marker2→999→2，使ready固定503 SERVICE_NOT_READY retryabletrue details readyfalse，无路径回显，live仍200，恢复ready200。这是有限点检查，不宣称完整DB结构审计。
- 匿名diagnostics401、普通已认证actor403、admin200、撤销普通credential后401。真实第二readonly SQLite BEGIN持读，主HTTP完成四条post写；管理员采样前后独立NOOP frame对象与物理WALbytes/SHA相等，回报frames/bytes一致，未推进checkpoint。持读条件人为可控，不推断所有WAL增长根因。
- 同步throwing sink不改变已提交post或health成功。真实Writable highWaterMark1固定callback屏障给1000条entry，pending<=64KiB且<=256，释放后drain/drop summary、pending清0、自己的drain/error/close listeners回到原数，stream不destroy。此处只helper待发送queue，首内在Writablebuffer独立于该pending计数。

父另授权单一builtCLI入口probe，非正式test/非current29：两个私有serve各动态127.0.0.1端口；默认health200，stderr一条白名单request_completed；--no-request-logs health200，退出结算后零条。stdout空、原admin token未串stdout/stderr，安全布尔摘要见observed-cli-log-entry；owned退出只用于清理，不作为B2有界shutdown验收。无产品重建。

## 保护、清退与范围

integrity：HEAD、旧4253review、SQL/archive4、schema2、mutable5原字节不变；source211→221，10新增/11授权变更，无旧fixture改动；docs44→45。唯一build后dist208tracked/152untracked。A10/B14冻结hash全匹配；C仅期望修正单列hash。cleanup ownedworker/CLI/private dirs0，新包文本已知token模式0，有限检查不是任意敏感研究内容全面扫描。

继承B1约40MiB正式case随唯一fullsuite实际一次：body41943040/wire42399852、receiver61/server8 heap样本，仅有限佐证非硬RSS保证。无额外大材料、600s、模型、宿主或公网实验。

请求日志是有限best-effort，丢弃可观测摘要不等于审计保证；自定义同步sink不得阻塞event loop。health/diagnostics为非原子有限采样，目录未配置明确区别，WAL NOOP不checkpoint、不自动回收、不证明reader因果。无WAL硬quota/全目录磁盘保证。preClose只标draining，B.2关闭预算、活动资源drain与严格lockrelease仍未实现。
