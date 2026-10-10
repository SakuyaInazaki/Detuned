# M4.2-B 限量接口事实

2026-10-08；只读，无测试/构建/联网；session详细策略交A另核，不自行定路线。

- protocol/package.json只直接依赖TypeBox与已锁ajv-formats3.0.1，没有直接Ajv provider依赖。tools.ts:19–20/42–43只有context/read公开验证helper，分别Value.Check原object/独立union；没有八工具统一完整验证入口。subscribe根allOf共享constraint仍需core独立验证，不能依赖TypeBox TObject Value.Check自动执行allOf。
- client.ts:919–1092从params构造HTTP字段：search只取filters.kind/tags/thread_id（936–944），publish/relate只取每分支已知payload，unknown参数可能被忽略；仅广告additionalProperties:false不足以在bridge实际拒unknown。
- 已安装SDK1.30.1 package.json公开exports `./validation`（types入口）与 `./validation/ajv`（constructor）。本轮仅读这两入口与types，未触生命周期实现。
- validation/index.d.ts仅export类型；ajv-provider.d.ts定义 `new AjvJsonSchemaValidator(ajv?:Ajv)`、`getValidator<T>(schema:JsonSchemaType):JsonSchemaValidator<T>`；types.d.ts:28输入unknown，返回 `{valid:true,data:T,errorMessage:undefined}` 或 `{valid:false,data:undefined,errorMessage:string}`。
- ajv-provider.js:6–12默认 `strict:false,validateFormats:true,validateSchema:false,allErrors:true`并addFormats；没有启用coerceTypes/useDefaults/removeAdditional。getValidator约54–77对完整schema交Ajv.compile/getSchema，不屏蔽allOf/oneOf，返回成功data为原input引用。可使用已有SDK依赖Ajv8.20.0，不需增加本仓库直接dependency；标准组合关键字由Ajv处理而非TypeBox object校验，下一包仍需有限真实schema反例验收。
- provider失败errorMessage来自Ajv.errorsText，可能含属性名等来访材料；公开工具错误需固定安全文案，不直接回显validator诊断。自定义传入Ajv实例可改变输入策略，若父选择默认应冻结不coerce/remove/default，不声称任意实例都不改输入。
- 已读session事实移交A：spaces.ts:95–115的Session含id/actor_id/space_id/client_name/client_version/harness_session_id/metadata/created_at；CreateSessionRequest必client_name/client_version，optional harness_session_id(max128)/metadata任意record。client676保Session信封/singleattempt；spaceservice204–222观察者授权、计量新ses并存储，非幂等。
- getMe/client660与getCapabilities652当前request<any>信封；MeResponseSchema actors42–50含actor/capabilities/allowed_space_ids/visible_spaces。server meta6–24 capabilities含server_version/api_version/modules_enabled/limits。所有八工具与thread/post/relation/events HTTP body本轮rg未见session_id落点；只有未启用review的reviewer_session_id，harness_session_id是创建session元数据而非write绑定字段。详细后续由A核，不重复扩大阅读。

父需冻结：完整校验落bridge还是protocol通用helper、采用现SDK默认provider与安全错误方式；历史被忽略unknown参数改拒绝的兼容边界；身份/空间变化、并发call/init失败怎样确定惰性session触发/复用，尤其现八工具没有session_id wire字段时是否只记录会话而不伪称写绑定。未作架构决定或产品实现。
