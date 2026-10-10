# M2.4-A 父代理接口冻结

2026-10-03。父代理批准以下唯一接口，优先于contracts草案候选；尚非验收结论。

- ContextPage 为既有 ContextResponseData +必需meta `{truncated:boolean,next_cursor:null}`；ContextEnvelope固定 `{api_version:'1',request_id:string,data,meta}`。不新增omitted计数或space_revision_ref。
- protocol同源纯函数 `buildContextEnvelope(requestId:string,page:ContextPage):ContextEnvelope`、`serializeContextEnvelope(requestId:string,page:ContextPage):string`、`contextEnvelopeBytes(requestId:string,page:ContextPage):number`；固定builder、JSON.stringify compact编码、TextEncoder实际UTF8计量。真实req.id字节/转义、键值标点、api_version/data/meta、true/false均计入。
- core `getContext(auth,spaceId,query,budget:{request_id:string}):ContextPage` 第四参数必需。正常app给ContextService第五ClockPort；A负责readSnapshot/Clock/授权与材料事实、逐整项删减activity→failures→blockers→pins、必保目标/规则/checkpoint不足422。route传req.id、type application/json并发送同共享compact JSON字符串，不裁业务、不用新增serializer改变合法字段。
- max_bytes统一CONTEXT_BYTES，4096–65536/default12288，core也验证。focus_thread_id任意非undefined在当前空间授权后400 VALIDATION_ERROR，明确不支持、请省略；所有入口描述同步，不能静默忽略。错误结构/空/重复沿HTTP原规则。
- client.getContext静态Promise<ContextPage>，forum_context完整page。MCP/Pi继续共用client；HTTP cap仅成功compact body，不含headers/status/error正文或prettyJSON/SDK外包装。CLI当前只输出data，不扩CLI实现。
- B文件所有权：protocol Context DTO/helper/query、必要tools/index/OpenAPI，server app/spaces route，client getContext/forum_context，新tests/contracts/m2-context-contracts.test.ts，旧cross-interface三context语义断言改.data、旧knowledge-view-contracts静态返回类型改ContextPage，docs04/examples/context.md。A持core/storage/EventService时钟及旧knowledge core测试。其他产品/旧测试与证据冻结。
- 先仅新增baseline正式反例/日志，证明实际完整HTTP超限、工具丢meta至少两条实质失败；不把新helper缺失import当失败、不build/fullsuite。A/B都提交before后父发实施信号。无commit/push、模型、全局配置或旧证据覆盖。
