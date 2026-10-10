# 中断窗口有限只读诊断（未复跑）

- 原统一source noEmit0/build0/新14专项0/typecheck0/lint0，各只一次；25尚未启动。
- 新14专项命令19:30:10.830→19:30:16.444 +0800，runner4.90秒。
- full命令19:31:28.400→19:38:22.117，413.717秒；runner412.65秒。
- targeted结束到full启动71.956秒，期间只type/lint与capture；无第二test命令。
- 首full实际527/569、48/79，42失败+1 Vitest RPC onTaskUpdate timeout，真实exit1。
- 输出完成顺序首失败文件：artifact-independent108814ms、read-contract108326ms、requestkeyCLI109026ms；不是精确case开始时序（runner未记录）。
- 28条case timeout代表：KCLI04 5s（实际95173ms）、logical-import B06 60s、read-independent health90s。
- 4条hook timeout代表：events E01、r4-c AE05、threadposts D05，均10s。
- 6条CLI watchdog/deadline代表：backup BKCLI02、artifact B03、当前D B02/B04。
- 2条ENOTEMPTY为backup-DhfFkh/backup-mUq8H6清理；schema-generation另见child status null断言，不能当业务返回断言已证伪。
- full日志新D C04/B02/B04亦超时；新14定向已通过不替代本次失败。
- pmset电源日志在同窗口确有19:31:42 Clamshell Sleep95s、19:33:30 Maintenance112s、19:35:30 29s、19:36:08 76s、19:37:32 45s；共357s，间隔DarkWake。现在有系统sleep证据，非仅猜测。
- 时间重叠支持广泛timer/watchdog干扰的环境解释，但不凭此单独排除所有42个潜在产品变体。
- 只读ps中本项目helper/CLI/vitest/schema-generator候选PID0；无对应已知owned listener。未扫描或关闭用户端口。
- 本包C owned consume-private目录0；另五个detuned前缀目录mtime在失败窗口，非本包owned，未删除。
- stable前source全哈希、4877旧review、SQL/archive/schema均匹配；A8/B6 freeze零失配，未改产品/超时/全局并发。
- 未kill用户进程、未改系统电源配置、未启动25或复跑full。
- 建议父裁最小区分：只定向当前失败WD B02（同builtCLI路径）与短OP B01（HTTP/core），记录耗时；无sleep窗口再判是否必要full复验。不得直接批量放宽期限。

原证据：[full stdout](observed-fullsuite-2026-10-08.txt)、[stderr](observed-fullsuite-2026-10-08.stderr.txt)、[真实命令](commands.json)。
只读：[保护/进程](interrupted-suite-inventory.json)、[临时目录](interrupted-suite-temp-inventory.json)、[严格Sleep/DarkWake事件](interrupted-suite-power-events-only.txt)。首电源过滤文件包含Wake Requests，精确论证只使用events-only文件。
