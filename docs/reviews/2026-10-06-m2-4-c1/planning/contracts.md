# M2.4-C.1 接入阶段1：合同、兼容与迁移清单

2026-10-06，已读AGENTS/README/docs00/08/11/progress及[B.2.2父批准任务书](../../2026-10-06-m2-4-b2-2/next-task.md)。当前接受基线B.2.2为311/32、current29/29，C.1仅规划；fresh计数由独验捕获。本阶段只写本文件，不改产品/正式tests/规范/probe，不跑before/tests/build。材料筛选路线完全沿父任务书，不重开算法。

## 共享导出与兼容候选（交父冻结）

最小新增两项导出位于protocol/src/search.ts：

```ts
export const ContextFocusThreadSchema = /* 全部现Thread metadata，title仅Type.String() */;
export type ContextFocusThread = Static<typeof ContextFocusThreadSchema>;
```

导入threads.ts ThreadSchema并展开其properties，只覆盖title为只读字符串，不带新写min/max长度。其他Thread metadata字段完整保留，不注入默认或null。不需新文件/encoder/helper框架；search→threads→posts没有反向search依赖，无cycle。现protocol/index export search已覆盖，不改无关导出。

contextDataFields :204–215新增focus_thread:Type.Optional(ContextFocusThreadSchema)，现ContextIncludedDataSchema/ContextOmittedDataSchema继续严格additionalProperties:false，并由现ResponseData/Page/Envelope组合沿规则状态与truncated相关性。只新增可省略字段，拒focus_thread:null/部分metadata。省略focus时core不构造该key，保持旧对象形状；聚焦成功core分支必须带完整metadata，必须计预算。optional描述兼容wire两入口，不能借optional在已聚焦业务中丢必需metadata。

现buildContextEnvelope/serializeContextEnvelope/contextEnvelopeBytes（search.ts:229–238）名字/签名不变，完整ContextPage自然包含新增字段。ContextResponseData与ContextPage类型仍原名，旧消费者字段不变；client.getContext:535–543返回整page无需新增method，query已透传focus；工具forum_context dispatch client:784–789已有参数，不加第9工具。核心最低response与规则省略/尾裁须保focus_thread，不让SDK/CLI做业务裁剪。

## Query、transport与纯结构校验

ContextQuerySchema search.ts:78–81 focus_thread_id现任意String且描述unsupported，实施时改非空非空白字符串shape及聚焦描述，max_bytes沿现4096..65536/default12288。拟新增validateToolContextParams(value:unknown):asserts value is ToolContextParams，置protocol/tools.ts，使用现Value.Check(ToolContextParamsSchema)只做纯结构/unknown字段拒绝；client.callTool forum_context先调用，不能复制ACL/目标/筛选规则。此纯validator新增导出也交父冻结；与现forum_read validator机制一致。

实际route在server/routes/spaces.ts:127–141，不是独立context.ts。现allowedquery/maxBytes/serialize已齐；focus parser可复用固定read route allowEmpty:true模式，将合法字符串（含空白）交core在当前auth后校验；重复数组/非字符串shape/unknown仍transport400。core在同snapshot refresh身份→space read→有效focus thread归属→材料及space高水位；正确own open/archived200，unknown/foreign404；空含纯空白/非字符串400。具体纯schema/transport处理不搬权限逻辑。

OpenAPI现context描述 :201 unsupported、参数 :205普通string、通用NONBLANK :652，实施仅同步实际focused metadata、错误政策、空间checkpoint和5/10窗口限制。tools.ts:259与CLI:306删除“暂不支持”文字，帮助明确整page/当前焦点、预算包含focus metadata。CLI既有--focus-thread透传 :312，不新增命令/聚合器；无focus输出仍完整data/meta且不加null。

## 必须迁移的旧正式断言（先清单，等父逐段确认）

本单元唯一旧tests候选为tests/contracts/m2-context-contracts.test.ts C03:72–76：

- :72循环内focus_thread_id=thread当前和坏budget/重复/空focus/unknown一起期待400；将这个不存在字面thread从400组拆出独立unknown404断言。合法ownthread200必须新建真实本space Thread，不把字面thread冒充有效目标。
- :76 client.callTool forum_context(space_id:sid,focus_thread_id:'thread')当前400，拆为未知thread404，并补真实ownthread200/新增focus_thread；合法/未知/foreign详细材料放新focused专项。
- :72–75空focus、坏预算、重复、unknown仍400，其他现C03 raw预算和无focus形状/format registry恢复原断言不改；授权先验不弱化。

integration/m2-context.test.ts C03:55–69由core独占列清单并改，已知:59–60 foreign-thread/空值一起“去掉参数”旧断言需要分离，:69撤credential带focus401必须保留。本单元不修改core旧tests。新增tests/contracts/m2-focused-context-contracts.test.ts独立聚焦专项，不靠改旧全部unsupported负例制造通过。

## 历史probe unsupported假设（仅枚举）

只读rg docs/reviews下mjs/py/ts及current manifest可执行材料发现原A verification/check-context-http.mjs:17（CX02-09）明确focus_thread_id=missing期待400，与C.1未知目标404冲突。:28（CX06）匿名带missing期待401，当前授权先验仍适用。该旧脚本还含A阶段大objective422规则假设，与B.1现规则ref降级已不同；不能只替换一行后宣称旧脚本当前全部兼容。旧字节不改、不运行后把冲突失败算回归绿；确需新版probe由父/独验新增明确归因版本。

同范围grep未发现第二个旧可执行focus unsupported400位置；这是当前文件搜索结果，不是所有自然语言历史材料穷尽认证。B.2.2 current29-manifest及run-prior未直接引用该A check-context-http，下一包命令清单由父/独验核原继承与版本化证据，不能删除检查或沿旧基线数。本规划仅枚举父已要求的冲突，不执行probe审计/回放；三遗失原fixture not_run保持原归因。

## 验收与窄所有权

未来独占protocol/search context DTO及必要queryshape、tools纯validator/描述、OpenAPI、server/routes/spaces必要focus parser、client纯dispatch validator、CLI既有help、独立focused contracts、docs04/examples/context焦点示例。index无必要不改，adapter不改，8工具名保持；core+storage负责筛选/snapshot/窄SQLPort与业务正式。旧contract仅上述精确区段等待父批准，其余旧语义字段/无focus成功保持。

新增contract需实际HTTP app.inject/socket独验核multi-thread干扰与完整焦点metadata、4K实际req.id边界/巨大metadata422、规则ref省略保focus/尾裁、same space fixed refs与跨thread source状态、archived/withdrawn/redacted/ACL/unknown/空/重复、无focus前后形状；安装Pi validator→execute/MCPstdio/CLI现--focus-thread及省略链交统一独验构建后实测。日期schema先核真实emitted UTC ISO毫秒/Date.parse/toISOString，局部FormatRegistry finally恢复，不恒true或删schema断言；不把AD ignored称格式认证。先freshbaseline→授权真实before→新反例→实施，当前不运行。

## 官方依据与安装重核

复用本日B.2.1 planning/contracts.md已实际web读取[dsh MCP官方README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)、[Pi extensions](https://pi.dev/docs/latest/extensions)、[Pi主线类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)；本阶段未重复抓取，不称新web认证。当前主线ctx ExtensionToolContext与已装0.87.1 ExtensionContext差异继续按安装实际validator执行，registerMcpServer当前能力不改变本项目HTTP扩展架构。

本阶段2026-10-06重新resolve adapter-pi symlink、读metadata与SHA256：coding-agent与pi-agent-core仍0.87.1；coding-agent package 627631b613ba4ca29eba8df793f5280fd20b19f01d73826e9ffda14c15def5dc，types.d.ts 14d00e645b453f4361440da6fcda86ed6cef9a8fc36d483a621a0250e0d4a396，agent-core package 26f991ea26187d52978c303811f32032c9fcdaec197d4dcf08d793bedffdb87c，与本日B.2.2相同。PATH pi/dsh均不可见，不证明全机无安装；dsh实际版本/四真实宿主会话not_tested，无安装/global/模型操作。只读初次误指server/routes/context.ts，已定位实际spaces.ts，无产品改动。

无父筛选路线的明确冲突。共享新增候选已发core对齐，父尚待冻结DTO/纯validator名字及旧正式迁移范围；本文件完成停写，等待freshbaseline与放行。不擅自build/test/commit/push/清理/修改旧证据，完整M2/T06/规模验收仍后续。
