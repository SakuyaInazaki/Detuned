# M3.4-A.1 独验准备（2026-10-08）

fresh基线 source197/docs42/mutable5、旧reviews4008（完整M3.3-C121文件）、SQL4/schema2、dist208tracked/104untracked、HEAD b8dacd5、dirty2833。只保护/读取，不运行build或产品；旧449/54/current29是历史。

本包只统一process-local actor写入限流与显式配置，A.2持久storage quota紧接，不在这里扩实验。父冻结default60/min、burst20、按actor跨token/space共享，标准buildApp服务图唯一meter；低层手组core须显式共享，不能声称跨server实例计费。10000actor容量仅可回收全满bucket，A小capformal+代码审查覆盖；C不造10001压力。

四个独验：真实HTTP controlledClock default边界/rollback/largejump；双token双space并发总预算与differentactor隔离、先鉴权/空间/对象作者优先；admission后有效业务失败扣一次、replay免、key conflict不扣、poll/ACK/read免，明确session/subscribe/deactivate/admin显式mutation扣额且无半业务/事件/幂等；builtCLI非法flags beforemkdir/listen且不回显输入，HTTP Retry-After整数秒与sharedclient现重试预算/同key正确重试。所有计费时点按父冻结，不笼统说所有失败收费。

helper仅固定server/client模式与时钟advance/set、固定SQL计数、rawHTTP/sharedclient retry屏障。server fixture显式ClockPort now/nowIso，不sleep猜补额；客户端第一次429在返回sharedclient前IPC屏障，父测试advanceclock再释放，真实client自身现Retry-After等待保持，未改clientrules。token仅内存/私有fixture，不写全stdout或成功JSON diff。

本轮产品默认不能被测试高值冒充；旧批量seed仅父明确授权的m2-thread-posts-read共享高limits以及scale/run-server显式benchmark配置，原业务断言保持。C不改旧tests/probes，不重复600s/额外大材料；统一build/type/lint/fullsuite+25retained在作者freeze后执行。
