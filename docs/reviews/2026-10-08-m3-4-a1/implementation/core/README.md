# A core交付

M3.4-A.1：标准组合根共享actor限流，管理业务下沉，fresh对象权限先admit。BigInt整数余额/ClockPort全局高水位、10000身份容量只回收补满、1..600000秒安全Retry-After；持续60/min与初始burst20，非固定窗口/持久额度。

源正式m3-write-rate-limit.test.ts为9case：默认20+1秒、回退/大跳、非整除速率精确补充、有限身份容量、replay/key冲突/失败rollback计费、admin/session/subscription及poll/ACK免计费、对象权限403先429、跨token/space和未授权不扣、artifact最终计费/replay。授权旧m2-thread-posts-read.test.ts只高量setup配置共享60000/10000，原10断言保留。

实际运行：source-first.stdout/stderr/exit-code为新9+旧10共19通过（exit0）。之后父批准墙钟回退retry提示产品窄修，将全局高水位时差计入；rollback-retry.*仅该1case通过、其余8skip，原首19未覆写。source-noemit-first.*与source-noemit-final.*各exit0；final包含retry提示修正。未自行build/fullsuite/lint/旧probes，最终门禁由C。

初版自审发现回退Retry-After只算欠额低估追平等待；余额原已不倒退。父确认BigInt追平时差+欠额ceil/clamp后修正，新增真实61秒及极端600000提示assert。首绿色只覆盖当时源码，不冒称最终全套通过。其它产品源码完成后停写，以freeze-manifest哈希为准。

限制：进程重启reset，多进程/绕过业务直接storage不受meter；手动core组图须显式同limiter。默认孤立构造保持旧兼容，不承诺独立默认对象图跨图聚合。stage I/O仍由附件既有caps保护。payload业务失败admission后不退款、进程meter不假称SQLite事务持久状态。A.2持久研究资源quota及M3.4-B运维另包，无schema/SQL/client/旧fixture修改。
