# M4.2-A 冻结契约

父已批准：使用安装官方SDK1.30.1，无依赖/SQL/schema/宿主配置变化。保8工具/defaultURL/60000ms sharedclient，启动/discovery零HTTP、无论坛session或ACK；全广告校验/身份preflight另包。

A模块：bridge.ts createMcpBridge({client:Pick<DetunedClient,'callTool'>,input?:Readable,output?:Writable,shutdownTimeoutMs?:number})返回{server,start():Promise<void>,close():Promise<void>,closed:Promise<void>}；bridge-results.ts安全封装；index.ts entryguard组合根/exportfactory，可导入不连接stdio/读env/network。B client/node resolveLocalToken仅main传环境两来源，坏配置启动固定安全失败exit1/零stdout/HTTP。

成功structuredContent={result:旧result}，text保持旧prettyJSON至UTF8<=16384，超则固定validJSON截断摘要指向structuredContent.result。错误isError+structuredContent.error完整，text至16KiB否则仅errorcode摘要指向完整error。public DetunedError保语义，真实运输/协议/timeout/abort与未知固定文字；未知工具固定VALIDATION_ERROR/零HTTP。stderr不raw name/args/SDK异常/cause/path/stack。

关闭：EOF/input异常/SDKonclose/显式close/signal/output错误统一同Promise/deadline，默认10000ms显式正safeinteger<=120000。父批准顺序sync closing+abortownedcalls→server.close停止SDK后续response竞态→await ownhandlerfinally+已started send写callbackflush→clean；不得单等SDKclose冒称清理完成。close/closed同成功失败结果且内部观察，重复调用不重置budget，不destroy调用者stream。超预算BridgeShutdownError固定safe reject，main失败固定诊断exit1，clean只exitCode0不process.exit0截buffer。native同步/不合作替身不承诺强制清理。

自有Stdio窄send覆盖使用SDK标准serializeMessage+Writable.write callback，跟踪all started sends/错误而非仅write(true)；SDK公共wildcard出口已核。工具HTTP只callTool+signal，不补ACK/业务写；mainsignal重复只触同close，不globaldispatcher。

A6formal有限真实SDK流与可控Writable/合作取消finally屏障/重复close/非合作或flush超界/UTF8边界，C再实际stdio子进程/HTTP。作者source定向及含testnoEmit，首失败保留，唯一build/full/gate归C。A只mcp源码/新正式/authorbridge与本契约，不跨B/C ownership。

父追加精度：close/closed发布终态前先清已确认监听；deadline失败不是底层write完结。若write真实callback/event未到，保每output唯一最小error/close observer直到该笔真实终结，不假删tracking/不claimclean；未合作仍宿主负责失败预算，main按预算exit1。无新timer或destroy，共享观察避免并发MaxListenersWarning。
