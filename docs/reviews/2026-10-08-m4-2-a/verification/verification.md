# M4.2-A 独立验收（父已接受）

最终默认全套600/600、85/85，新正式15项（A6+B3+C6）；build/typecheck/lint/full各一次，current29组合29/29为四门禁、24原始probe、已批准A.1第11适配。25在父允许的NC03夹具等待期先执行，各真实一次；最终full含其修后稳定快照。原第11默认命令未执行，不称其成功。全套继承40MiB实际一次，无另起大物料/600秒/模型/四宿主评估。见[机器结果](final-results.json)、[逐命令及真实退出](commands.json)。

首失败完整保留：C source noEmit2仅Fastify eventService装饰类型及env数组推断，补真实类型与数组context后0。首次三文件专项C6/6真绿，A/B两文件各零case收集失败：根Vitest客户端前缀别名吞Node子入口。父批准仅根测试配置加入精确node优先映射，其他alias/选择/并发/预算不动，见[原hash及归因](C-config-freeze.json)、[小diff](vitest-node-alias.diff)。随后A6、B前2、完整旧E7全部通过，NC03从根包未声明依赖上下文启动bareimport失败；作者仅cwd改正式MCP消费者包，单项1pass2skip。原stdioA05/A06首绿，E07旧native-striptypes入口因新增相对.js模块在SDK connect前关闭；父批准仅child改公开built入口，原SDK取消/HTTPdisconnect/noACK与10秒保持，单项1pass6skip，见[精确diff](E07-built-entry.diff)。这些重复/skip不增加新15计数。

C六组均首次真实built通过：

- 官方SDK StdioClientTransport initialize/listTools八工具，实际HTTP计数/论坛sessions零增；两个独立native bridge各以私有不同actor凭据发布，post.author_id准确无串身份。
- 小结果text逐字等原prettyJSON/structured.result；真实thread_posts保data/meta；约21KiB合法研究正文只text固定validJSON摘要，structured完整保正文。不是额外规模负载。
- unknown工具哨兵isError/VALIDATION_ERROR且零HTTP，匿名protected调用UNAUTHENTICATED；坏/冲突tokenfile启动真实exit1/零stdout/零HTTP，stderr无路径/token/哨兵。合法凭据仅内存/privatefixture。
- 真正空消费者poll进入原服务等待屏障，SDK AbortSignal传播到nativeHTTP，资源1→0、ACK不推进；桥仍可listTools。重复close共同确认真实exit0，没有watchdogkill。
- 分别明确stdin EOF与重复SIGTERM，在真实pendingHTTP屏障后退出code0、HTTP资源归零、ACK不动、stdout各line是JSONRPC，owned20秒watchdog均未触发。
- close后新进程同consumer重投同未ACKbatch/events，实际数据库from/through/consumer范围一致、ACK保持；next_cursor仅验证string形状，签名可续签，不断言字节永久不变。

固定test-only NativeBridge transport仅spawn当前built MCP，实际SDK Client驱动协议，拥有exact ChildProcess可观测EOF/signal/exit/reap；无SDKprivate字段、任意命令IPC或产品故障开关。官方SDK transport.close自带2秒自动kill升级，不把其resolve视作nativeEOF正常证明。A非合作handler/output故障是受控factory场景，真实nativeHTTP证据不外推任意fetch。A首真实late-write error未被观察导致unhandled、修后定向结果均保[作者报告](../author/bridge/report.md)，不是未运行通过。B凭据迁移算法不改变E原语义，完整E7包括真实FIFO源child已回归。[A→B互审](../author/bridge/peer-review-credentials.md)与[B→A互审](../author/credentials/peer-review-bridge.md)无新增阻断。

[完整性](integrity.json)：HEAD、5154旧review、SQL/archive/schema2、五状态文档保持；A5/B9v2冻结零失配，授权外source0，260source/config/tests，dist208tracked200untracked，finalstable各hash保持。owned MCP/CLI候选/私有目录0，未广泛kill；有限132新文本token模式0，不等于全研究数据脱敏。无持久化schema/SQL/deps/globalconfig改动。startup/discovery本包明确零HTTP，不做/me/session；完整schema与身份/session另M4.2-B，本包不等于完整M4完成。

父于2026-10-08接受上述有限本机结果；600/85、新15、current29组合29及四门禁各一次事实保持，下一阶段另冻结。
