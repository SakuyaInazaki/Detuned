# M4.2-A A桥交付

## 实现与接口

index入口guard导出createMcpBridge与BridgeShutdownError，import不连接stdio、不读env/credentials/network。main用client/node共享resolver两env来源/defaultURL/60000ms；固定stderr，仅显式start连接，不建session/preflight/ACK/新工具。bridge.ts factory client/input/output/budget注入，默认10s最大120s正safeinteger；{server,start,close,closed}。SDK1.30.1 serializer由安装package wildcard公开出口调用，无依赖变化。

结果structuredContent.result包旧结果，16KiB UTF8以内保持prettytext，超完整指向摘要；error isError/structuredContent.error，public真实DetunedError保语义，其他真实类型或未知固定safe。未知tool固定VALIDATION_ERROR/0HTTP，无rawname/args诊断。

runtime关闭同Promise/deadline：sync stop+ownedabort→SDKclose停止新dispatch/SDKresponse竞态→await handlerfinally/已startsend真实writecallback与flush确认。EOF/输入error/close、SDKclose、mainsignals、outputfault合流；重复不reset。closed/close终态共享同成功失败语义且内部观察；mainclean仅exitCode0，failure固定诊断exit1。非合作write超时保失败并保每output唯一observer等latecallback/error/close，不伪clean、不destroy共享stream、不新增timer/daemon。

## 真实失败与验证

首collect client/node alias失败0case保留。第一次实际6case全部断言通过但标准Writable callback(error)晚emit时listener先移触uncaught，runner1；这是已修产品生命周期缺陷。先per-send观察验证fault绿，再按父并发/timeout边界收口sharedobserver与真实pendingwrite追踪；latest两个影响组2pass4skip/exit0，无unhandled且16并发只一observer、lateerror被观察后清退。其余4断言此前实际运行，但尚未最新全6同次绿，C统一built窗口负责。最终source-noemit-freeze含新test exit0；其前typecheck实际序列不掩盖。

## 有限边界

Writable callback说明可确认底层Writable完成，不等于宿主已理解/处理；不能硬抢占同步native/非合作替身。没有广告完整校验/me/capabilities/session绑定，本A不冒称M4.2-B或四宿主已验收。所有作者formal在私有可控Node流/真实SDK，无宿主模型/真实credentials；未作者build/fullsuite/gates。
