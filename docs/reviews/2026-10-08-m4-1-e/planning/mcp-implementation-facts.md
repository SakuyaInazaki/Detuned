# M4.2 本地 bridge 现状事实

2026-10-08；只读源码/既有测试，未启动host、测试、联网或读取实际env/config/凭据。SDK内部生命周期由A另核。

入口为 `packages/mcp/src/index.ts`，bin/main=`dist/index.js`；单文件顶层创建client/server并main连接StdioServerTransport，当前无可独立导入且不启动的factory。包依赖已有SDK/client/protocol，无单独凭据模块。

## 八工具与返回

工具广告来自 `packages/protocol/src/tools.ts:259–301` DETUNED_TOOLS，同名schema；dispatch复用 `packages/client/src/client.ts:919–1092` callTool。

| 工具 | 参数/实际dispatch | text内JSON形状 |
| --- | --- | --- |
| forum_context | space_id/max_bytes/focus_thread_id；共享context验证 | ContextPage `{data,meta}` |
| forum_search | space_id/q/filters/limit/cursor；共享search | SearchPage `{data,meta}` |
| forum_read | 联合kind；space/post_revision固定revision、有界cursor；thread_posts目录；post/thread单对象 | 有界三族page完整返回；旧post/thread返回data |
| forum_publish | thread/post/revision/withdraw联合，必request_key | 各write wrapper `.data` |
| forum_relate | create/resolve/reopen联合，必request_key | 各write wrapper `.data` |
| forum_subscribe | consumer_key、filters、start/checkpoint、旧必request_key；共享constraint广告 | `{subscription,consumer}` data |
| forum_poll | consumer_id/limit/wait_ms | 原poll data；无自动ACK |
| forum_ack | consumer_id/batch_id/next_cursor | 原ACK data；只显式此动作确认 |

bridge成功统一 `{content:[{type:'text',text:JSON.stringify(result,null,2)}]}`；失败 `isError:true` + text内 `{error:{code,message,details}}`，不是HTTP envelope或结构化content。没有新增review/任意本机附件工具。

## 身份、启动与生命周期

- MCP index.ts:12–25：env token truthy则trim并优先；env tokenfile truthy则无界readFileSync、失败打印raw FS message到stderr后匿名返回。双来源未冲突拒，selected失败fallback匿名；未限制UTF8/末段软链/FIFO/64KiB。这是实际缺口，CLI E resolver尚未接入MCP。
- client显式timeout60000（31–35）；baseURL env或loopback默认。没有读取宿主全局配置/模型Key。
- startup/listTools仅connect和读取静态工具目录，不HTTP getMe/capabilities、createSession、write或ACK。广告不等于论坛session/身份握手。
- 无capabilities/me/session绑定、harness_session_id生命周期、换身份的本地状态缓存；forum_publish输入不自动注session。docs06:20“获取capabilities/me→惰性session”是计划而非当前bridge行为，不能声称已实现。
- handler将SDK `extra.signal`原样传callTool（index.ts:64），各HTTP wrapper传signal；预aborted在client.ts:920抛普通固定Error。取消不生成ACK。
- bridge未对每一广告schema执行统一Value.Check；callTool显式本地验证context/read，其他wrapper构造字段后由服务业务检查。额外未知字段可能被构造过程丢弃，不能宣称广告strict schema均由bridge执行。
- 无自有close/EOF/signal handlers、active-call登记或显式client/transport清理；main只connect，fatal打印raw err.message并exit1。实际EOF/SDK close/cancel行为需A内部资料与下一包真实进程验证，不凭此文件断言hang或已安全释放。
- stdout只SDKstdio输出，没有console.log；stderr固定connected日志，但工具错误包含来访name及raw error.message，fatal/凭据读错也raw。无本地安全错误出口保证，服务public错误仍需保语义。

## 真实既有覆盖与缺口

- `tests/contracts/m0-m1-adapters-regression.test.ts:68–87` A05实际builtstdio discovery（服务端口不可达，说明发现不需HTTP）；91–161 A06实际publish合法/非法、isError/VALIDATION_ERROR，finally双方close。
- `tests/contracts/m3-events-contract.test.ts:87` E07实际SDKstdio取消→HTTP连接关闭；不是EOF/异常断stdin/并发close/resource-drain矩阵。
- cross-interface-contract与m2-search-contracts、m3-events-contract含共享dispatch/page/cancel合同；m0-probes:74的SDK handshake是probe，不等于四真实宿主T10/T20认证。当前未见bridge四来源冲突、坏tokenfile安全stderr、EOF过程中无遗留call的正式覆盖。
- docs04保持八工具/取消不ACK与页形状；docs06凭据多来源拒与身份/session序列尚有bridge实现差距；docs09 T10/T20仍要求四宿主实测，不能用本地SDK代替。

最小候选包：先bridge安全凭据/错误输出与可控factory，保八工具和现shape，以真实stdio startup/discovery零业务副作用、cancel/EOF/close及安全stderr补验；身份/capabilities/session绑定是否纳入及触发策略须父冻结，不能自动创建session或增加工具。另包才按官方版本推进真实宿主适配，避免把桥工程验收扩大为全M4通过。
