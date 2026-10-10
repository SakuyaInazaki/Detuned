# MCP session 接点事实（2026-10-08，只读）

- `protocol/src/spaces.ts:95–115`：Session={id,actor_id,space_id,client_name,client_version,harness_session_id:string|null,metadata,created_at}；CreateSessionRequest 要求 client_name/client_version 各1..64字符，可选 harness_session_id≤128、metadata。没有传入 actor_id 或 session_id。
- `core/services/space-service.ts:199–224`：createSession 要求当前身份对空间 observer 访问，扣写额度，随机新ses ID，actor_id取认证actor、space_id取URL，然后storage.createSession；不是幂等创建，没有查重/恢复。
- `storage-sqlite/src/sqlite-storage.ts:406–437` 与 `core/ports/storage.ts:98–100` 提供 createSession/findSessionById；本轮rg确认 core业务没有调用findSessionById。数据库历史sessions保留，未见客户端/HTTP查询或按harness_session_id恢复入口。
- `client/src/client.ts:676–677`：createSession(spaceId,CreateSessionRequest,{signal?})返回旧Session信封，requestWithBody retryBudget=0，单attempt，路径encode；响应丢失结果未知，不能自动再建。
- `client.ts:652–662`：getCapabilities/getMe返回request的{data,meta?}，目前泛型any。`server/routes/meta.ts:7–34` capabilities data含版本/modules_enabled/limits；它是匿名能力广告，不证明某身份的空间访问权。
- `server/routes/meta.ts:36–65` me需认证，data含actor、credential capabilities/allowed_space_ids、最多100 visible_spaces的id/slug/role；不能把none或列表截断推断成完整授权结果。具体操作仍服务端鉴权。
- **没有getSpace client方法，也没有GET /spaces/:space_id**（client局部及server/routes/spaces.ts核）。现有getSpaceRevision返回带预算meta的历史公开revision；getContext返回ContextPage，两者是受授权读取，不是创建session的许可替代。
- `client.ts:919–1093` 八工具callTool opts仅signal：context/search/read/subscribe/poll/ack各固定投影；publish四分支、relate三分支固定构造body，**均不接收/转发session_id**；参数里多加session_id会被这些投影丢弃。
- `protocol/src/tools.ts:218` reviewer_session_id属于未来review工具定义，非当前八工具；不能借此宣称八工具已绑定session。
- `core/services/post-service.ts`、AuthService与当前protocol/posts局部查找无session_id；schema.sql只有sessions.harness_session_id。故当前八工具可无forum session调用；不存在需补的post session所属actor/space检查，真正创建时约束在SpaceService上述入口，不能虚报已有绑定校验。
- `client.ts:191–199` 真名RequestOptions（不是ClientRequestOptions）只有method/path/query/body/requestKey/signal；没有会话诊断headers/元数据注入选项。客户端也无全局session绑定字段。
- `mcp/src/bridge.ts:16–21` 当前factory只需client.callTool，若后包要createSession/getMe等需父冻结扩大Pick范围；当前import/factory不做初始化HTTP。
- `bridge.ts:72–86` 每known call有自有controller与calls Map，SDK取消转发controller；try/finally内await callTool，finally移listener并结束ownedtask。这是可挂惰性工作的位置，不是现成共享初始化/取消协议。
- `bridge.ts:89–104` close同步closing、abort全部calls，先server.close，再等calls finally/sends，同一deadline/Promise；并发初始化若脱离call ownedtask，目前没有独立追踪槽，不能声称会被close等完。
- 待父选择：是否仅诊断性forum session、初始化共享Promise的身份/空间粒度、取消单等待者还是共享工作，以及response丢失后不可恢复的明确策略；本页不新增hook/framework，不运行测试或修改产品。
