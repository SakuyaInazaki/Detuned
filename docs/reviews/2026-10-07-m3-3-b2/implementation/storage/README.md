# A implementation evidence

Before为缺能力事实，不是missing-import产品反例。tests-first.log实际6项3pass/3fail；busy诊断只1项失败+5skip，定位better-sqlite3 iterate持query时写FTS被拒。改为rowid keyset后tests-second.log 6/6。随后增加墓碑/附件、完整链业务负例、缺resolution历史/terminal冲突及postunlink双故障四项，tests-third.log 10/10。不把这些复跑合称首次全绿或累加formalcount。源码alias noEmit first失败（bootstrap签名/局部narrowing），修后initial-fixed及second/third通过；未build/fullsuite，C统一验证。

主体逐line私有SQLite事务，无全空间数组；来源actor禁用、synthetic墓碑、本地hash、FTS最新可见revision、JSONtuple provenance、有界summary、新local事件、final FK/integrity、nooverwrite与取消检查。128处理/validation rows让出；SQLite单SQL不能硬抢占。publication复用offline-backup函数窄导出与两个真实readiness hooks，未新建通用框架。

A自身尚未实跑真实HTTP新admin读写（C独验负责）、全部故障stage枚举、硬CPU/内存容量、跨平台介质、模型/外部网络。source文件/SQL/旧证据不应因验证改变；tokens不入log。

## Review窄修与最终作者窗口

B两阻塞finding关闭：input用O_NONBLOCK|O_NOFOLLOW后sameFD fstat拒FIFO，final FK检查prepare(PRAGMA foreign_key_check).get首违规。fifo-before.mjs真实无writer子进程旧flags open卡住，1500ms watchdog kill并reap/清私有FIFO（fifo-before.log）。新增FIFO正式case在2s父watchdog子进程实际API快速INVALID_INPUT，另新增小孤儿thread_version负例；tests-fourth.log正式12/12、typecheck-fourth.log源码alias noEmit exit0。FIFO child调用同一条case的private分支，不与正式12累加。未造2M违规压测。

第三轮10/10已实跑，第四轮12/12因新增有意义case与窄修重跑，不说首次全绿；原first/diagnostic/second/third全部保留。metadata额外16KiB本地限制、schema2与源不升级、API读取/派生资格边界见frozen-contract/docs03/07/ADR038。B只读审见transport-cross-review.md。产品最终freeze hashes见freeze-manifest.json；C统一build/门禁，A不运行fullsuite。

## FIFO计时设计修正（仅test）

C首fullsuite435/436的FIFO killed=true原日志在C归档不改。旧2s timer从spawn pnpm开始直到整个Vitest runner close，包含TS加载/runner启动与退出，未测纯special-file处理，因并行负载可能杀尚未调用API的子进程。现私有Unix socket固定ready→go→done协议：15s启动独立界，child ready后parent布2s operation watchdog再go，done即结束operation timer；runner回收另15s有界。超时杀detached processgroup并等待close，所有timer/socket/FIFO私有目录finally清理。真实无writer/INVALID_INPUT/源FIFO仍在/无target断言保留，未改产品或简单放宽2s。

首改后定向在sandbox私有socket listen EPERM，tests-fifo-readiness.log保留，尚未运行API；同限定命令经工具批准本机执行，tests-fifo-readiness-local.log 1pass/11skip，包含ready/done/operation毫秒/killed=false；不是12/12或全suite重跑。该有限环境失败不替换C原fullsuite失败。C需必要测试snapshot更新后最终门禁，A不跑其它tests/build。
