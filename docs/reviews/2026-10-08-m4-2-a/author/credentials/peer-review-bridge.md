# B → A bridge 只读互审

2026-10-08。独立阅读A冻结的bridge.ts/index.ts/bridge-results.ts及m4-mcp-runtime.test.ts、冻结契约；未运行检查或修改产品/测试。结论：本包冻结范围内未发现新增阻断。

- index.ts:9–11只向Node resolver传environment两个来源，选定失败在创建client/连接stdio前抛；21固定失败诊断exit1，不回显凭据/path/cause。主入口guard20防仅导入启动；没有startup HTTP/me/session/ACK。默认URL/timeout60000保留。
- bridge.ts:71广告仍DETUNED_TOOLS八项；75拒未知名后才调用client，无来访name插值；83传组合AbortSignal。新call在closing时73拒，退出不自动ACK或追加HTTP。完整广告校验/身份session仍后包，不将此视为已实现。
- bridge-results.ts:7–14按UTF8编码prettyJSON判16384bytes，structuredContent.result保完整原对象；超限text是明确摘要非部分result。17–30错误isError/structuredContent.error，public DetunedError保原语义，真实运输/协议/超时/取消及unknown固定文字，超限保error.code/full_error。生产sharedcallTool结果为JSON对象/页；不宣称任意注入循环对象都可序列化。
- bridge.ts:76–85登记整条call，SDKsignal转controller，finally移listener并finish；88–114同一closePromise，先closing并同步abort全部，再进入cleanup。首次timer保持ref且repeat不新建/延长；server.close后等待当前calls和已开始sends，failed不能resolve clean。同步原生阻塞不可硬抢占。
- send37–59自有writes/sends观察真实Writable回调，未确认写不能只靠SDKclose视为完成。正常回调finish删除write、promise双分支观察；同步throw转固定失败；fault63–67隔离固定失败并完成已登记write。handler被SDK取消后不保证回复仍发送，但不会报告未确认写已clean。
- 特别核deadline后迟到callback(error)：49–53在error回调不提前finish（等待Node随后error/close）；finally104–108若writes仍非零保唯一output观察者。迟到error进入fault→finish，44待terminal且writes零才detach；不会在计时器到期就撤掉仍需捕获的error监听，也不claim clean。若backend永不提供回调/事件则保该观察者，close已reject，属于未确认失败边界。
- close清input自身监听，output只off自身error/close，不destroy宿主共享streams；main15正常await start/closed后仅exitCode0，不用process.exit0截断成功flush。失败路径16固定诊断exit1允许强制终止未确认资源，finally17移自身signal listeners。

正式test源码第1组覆盖import/factory/discovery/unknown零调用；第2组16KiB多字节与错误摘要；第3–4组EOF整call finally和已开始write；第5组deadline保失败、迟到callback(error)仍被观察且最终listener清退；第6组多send共用fault生命周期。这里仅阅读断言，不以作者日志替代代码审查或宣称独立复验。

限制：本轮没有新fault实验，不认证所有自定义Writable的Node事件契约、任意同步阻塞或四真实宿主；完整schema/capabilities/me/session绑定仍下一包。库宿主超时后仍不合作的对象可能保必要listener，不能说失败等于资源clean；C统一真实进程和保护核验另见其报告。
