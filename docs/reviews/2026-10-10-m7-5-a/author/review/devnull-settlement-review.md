# M7.5-A devnull 异常收口复审

通过有限诊断静审：outer b714248ce4a950b232f36efa8e6a0d22ae99f83aece8b59dafc6d1b34e50976e，plan 346fef6933d4033192af19907a782e97651bd78c633164db9ff31eec0c52e04f，controller 054bedcedb597089197fd411c6f1f780d0055e0c4540f3cd87aadfa3c2ae9eff。

已核实际代码：每个 Popen 阶段的 ps/proof/communicate 异常进入 finally；poll 的真实退出状态、PID/group presence、raw 输出在 JSON parse 前以 wx 收据保存。未 proof 路径不发任何 signal，仅有界等待；未知 close/presence 保持失败与 root。正常 pass 必须 code0、真实退出、PID/group absence、未 timeout、输出大小界内。原首次缺 red 收据明确不重建，36804 拒绝字节与原报告保留。

controller 同步 EPERM 记录 noPID/actualClose=false；red 仅 exact EPERM/noPID/正控与 sentinel 拒绝可通过。green 仍需实际 child proof、close0/null、PIDabsence。固定 Node/env、原 policy 与仅 literal /dev/null file-write-data 候选、30 秒及 3/5/5 阶段、device 绑定保持。

可由 D 按 root 既有条件授权执行一次不超过 30 秒的诊断复跑；本结论不授权产品全测、Pi、清退原 fixture 或其它实验。未运行 Node、probe、测试或进程查询；实际 red/green 尚待收据。
