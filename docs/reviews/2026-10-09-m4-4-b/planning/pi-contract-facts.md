# Pi 工具与夹具映射（有限只读，2026-10-09）

来源为仓库锁/adapter devDependency 的官方0.87.1安装版；本次只读三SDK类型/wrapper文件及旧C03相关段，不运行、不改产品。路径前缀 `packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/`，真实宿主事件仍由A原型确认。

## 工具/命令边界

- 官方 `dist/core/extensions/types.d.ts:345–377`：execute(toolCallId,params,signal|undefined,onUpdate|undefined,ctx)→Promise<AgentToolResult<TDetails>>。八工具共用此签名，并非MCP isError结果契约。
- `extensions/wrapper.js:13–15`及`tools/tool-definition-wrapper.js`直接调用definition.execute并补runner context，没有catch转成成功。当前adapter工具错误throw（旧S12/C03亦assert rejects）；返回details中的error不能自行等同失败。
- details可存通用typed内容，但本次三文件不能证明标准UI自动展开safe error details；不得承诺“放details即可被官方显示”。失败具体安全展示/throw类型需父按原型与既有throw语义冻结。
- 当前index.ts:54–68忽略onUpdate/ctx，传signal，成功content为完整prettyJSON、details为result；preaborted抛裸Error。无生命周期hook或generation resource管理。
- index.ts:74–111两命令handler→Promise<void>，UI notify或headless console.log/error；catch直接err.message。它们不是tool结果，不可把isError混进命令返回。

## 旧夹具与预检影响

- `r4-c-contracts.test.ts:1510–1564` C03-1逐命令/UI/headless/成功失败，assert恰1fetch与完整中文message。Me成功fixture仅actor.id/display_name、visible_spaces:['space']，不满足严格Me schema；需补kind/created_at/disabled_at/capabilities/allowed_space_ids与visible_spaces对象。capabilities当前仅server_version/api_version，若新预检增加真实字段校验须显式补合法fixture。
- C03-1未测试activate后env变更；不能据此声称新snapshot策略打破该断言。它在activate前设置token，不提供双来源冲突case。
- `:1572–1600` C03-4默认首fetch即坏JSON/409业务错误且assert1fetch；新binding预检需先返回合法capabilities/me/session，再让真正业务请求返回原错误。原完整409/code/details断言应保持，协议错误safe映射若改变需父明确兼容选择。
- `:1602–1705` C03-5七write分支validator测试保持；liveexecute真实服务可自然提供cap/me/session，不能镜像伪造预检。它目前直接execute仅两参，新增hooks注册fake仍on()空函数。
- 已归档S12模拟失败/预取消test也可能因cap/me/session预检改变请求顺序；其预取消零业务语义应保持。当前C03段本身未新增timeout/cancel专测，不能泛称所有生命周期受影响已定位。
- 待改产品准确现入口只有 `packages/adapter-pi/src/index.ts`；必要新helper/API及旧test范围须父下一冻结，当前不自行创建。

## 生命周期仅类型事实

- types.d.ts:417–424 session_start.reason='startup'|'reload'|'new'|'resume'|'fork'，previousSessionFile可选；不是独立session_new事件。
- :431–441 session_before_switch.reason='new'|'resume'/targetSessionFile可选；session_before_fork带branchEntryId；:479起session_shutdown。事件注册在on重载:981–988。
- 类型存在不证明emit路径/等待完成，尤其同步session.dispose不能冒充异步清退；A真实runtime prototype之后父才冻映射。

## 精确只读hash

- adapter index：402f1cffdc66391220cabb3a9536bfe44d4b85066deaab18d90cbac4d68acfef。
- 旧C03文件：b34ccb00456ba3575cd3d59404d4ab7d341118a41f0af7051b53023360c04b40。
- SDK types：14d00e645b453f4361440da6fcda86ed6cef9a8fc36d483a621a0250e0d4a396。
- SDK extensions/wrapper.js：28cdcaf6e2a9fb402bf7cc22855369c236329dcc10876d234f575a2f1eb28cb4。
- SDK tools/tool-definition-wrapper.js：b08ccb77cf3664c3b42e5cee858e150925c0eedbaca397474c3af3de22030abd。
- 没有对安装包或旧test写入；不填未读取的完整SDK图、UI错误renderer或真实事件结果。
