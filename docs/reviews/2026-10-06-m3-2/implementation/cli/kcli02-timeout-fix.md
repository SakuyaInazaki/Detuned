# KCLI02 真实进程测试门禁窄修

C fullsuite-first记录373/42中的旧UTF8夹具失败，KCLI02已通过但接近默认5s边界（父/C报告5018ms）；fullsuite-second在旧UTF8通过后，KCLI02约5095ms触发默认5s，372通过+1超时，没有业务断言差异。原两个suite证据由C保留。本case串行调用多个真实CLI子进程完成七分支及重放，单独运行约2.7s，42文件并发使调度越过5s。

父批准只将该case显式设置30_000ms。原helper没有child门禁，新增每CLI child 10_000ms deadline，超时SIGKILL并reject；error/close清timer。所有期望、业务比较和其它case timeout不变，无retry、无产品或build改动。精确diff与最终sha256另存。

定向第一次普通sandbox exit1：listen EPERM，未到业务；原日志保留。随后同命令授权本机监听escalation exit0：KCLI02 1通过，4跳过，1文件，2772ms；不能登记5项全通过。C可开始必要third fullsuite，不重复build/其它检查。
