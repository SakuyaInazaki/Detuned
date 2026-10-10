# 自动入口最终清理证据

仅新增wrapper及必要README，四个测量mjs保持freeze-v2全部hash；最终[freeze-v4](freeze-manifest-v4.json)，前v1/v2/v3均保留。默认自动入口首次v3tiny400逻辑/591HTTP/10秒退出0，双固定独验各23HTTP成功后原子ok，未重复正常負载。

父授权的真实失败实验在preflight以ps证明runner/server组属于本observer创建的wrapper，然后仅SIGSTOP该自有组并TERMwrapper。首实验5016.136ms非零已退，但exit callback的signal0 EPERM未处理，未flush automatic-gates，observer随后ENOENT退出1；[首原记录](fault-experiment.json)、fault-wrapper.stderr.log、fault-observer.stderr.log保留。这是新wrapper自身错误，非产品或600秒负载错误。

修复权限未知探测受控事件、5秒TERM→仅自有safe PID/group的KILL、有界等待/清timer后，同故障唯一追加复验：[真实结果](fault-experiment-v2.json)5036.250ms wrapper按取消exit1、observer exit0；5秒KILL事件已记，所有记录自有PID/子进程read-only ps无匹配，成功gate未写，监听ECONNREFUSED，测量window未启动。公开[阶段记录](cleanup-fault-final/automatic-gates.json)，完整私有gate不复制公开。unknown_permission不伪称已消失，最终PID消失由外部ps核实。

修后node --check scripts/scale/run-verified.mjs exit0（automatic-cleanup-final-check stdout/stderr）；未再正常smoke/600秒/build/fullsuite。原正式full的exit1/complete=false和原门禁时限不变；独立补完另由verification报告解释，自动wrapper只tiny编排实证。
