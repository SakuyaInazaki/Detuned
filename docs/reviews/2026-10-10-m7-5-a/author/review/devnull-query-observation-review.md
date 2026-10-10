# devnull query 观测窄审

通过：controller 3012B b4f0046788d890a5c10a13b7434bbdd7d0276950a92d6b84c35beb78b6d2f0b5。实际 before/diff 与当前代码仅加入 queryDiagnostic。原 exact ps argv、pipe/1000ms/4096B、UID/directPPID/PGID proof 条件、2000ms timer、同步/异步错误统一及 red/green pass 条件不变。

新增输出仅固定 error/signal/stderr 枚举、status/byte count/shape，以及 exact ps 输出确为四个安全整数时的数字字段；没有 raw stdout/stderr/未知名称。诊断不授予归属权限，也不会把 proof mismatch 转为通过。可按 root 此次窄授权由 D 仅运行一次 green ≤5 秒观测；不外推全部测试或其它实验。未运行或查询进程。
