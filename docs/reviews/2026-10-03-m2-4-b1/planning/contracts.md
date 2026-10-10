# M2.4-B.1 协议、读取与工具合同草案

2026-10-03，仅规划。已读当前AGENTS/README/docs00/08/11/03/04与M2.4-A最终报告/next-task/facts。未改产品/正式测试/规范，未build/fullsuite、安装升级或调用模型。父决定最终方案；B.2帖子/主题正文不进入本包。

## 1. 推荐方案：固定修订JSON文本页

与核心A对齐，父已偏好唯一重组文档 **`{objective:string,rules:string[]}`**，字段顺序固定，JSON.stringify compact编码。不是完整SpaceRevision导出：不包含pinned_refs、review_policy、check_profiles、editor_id/created_at或隐藏配置。context原policy_revision仍政策版本，不能冒充内容revision。

候选共享定义：

```ts
SpaceRevisionRefSchema = Type.Object({space_id:Type.String(),revision:Type.Integer({minimum:1})}, {additionalProperties:false});
SpaceContentDocumentSchema = Type.Object({objective:Type.String(),rules:Type.Array(Type.String())}, {additionalProperties:false});
SpaceRevisionPageDataSchema = Type.Object({
  ref: SpaceRevisionRefSchema, encoding: Type.Literal('json'), chunk: Type.String(),
  start_byte: Type.Integer({minimum:0,maximum:Number.MAX_SAFE_INTEGER}),
  end_byte: Type.Integer({minimum:0,maximum:Number.MAX_SAFE_INTEGER}),
  complete: Type.Boolean(),
}, {additionalProperties:false});
SpaceRevisionPage = {data:SpaceRevisionPageData,meta:{truncated:boolean,next_cursor:string|null}};
```

start_byte/end_byte是唯一compact文档的UTF-8 byte起止，半开区间，不是UTF16字符/码点计数；chunk为该区间的完整Unicode文本，不能切多字节字符。首段start_byte=0，后段start_byte=上一end_byte，end_byte>start_byte；最后complete=true/end_byte=文档总字节数。所有chunk按顺序拼接后JSON.parse精确重组原objective/rules；内容自身的JSON转义（包括引号/反斜杠）仍属于文档，外层chunk再转义必须按实际HTTP计量。原历史规则长度不重新套新写限制。

建议页meta判别与data.complete对应：未完成时truncated=true、next_cursor必需string，完成时truncated=false、next_cursor=null；通过整体页Type.Union两个完整branch表达，不在schema里留与执行不一致的自造条件。A原候选meta.truncated=false表示“已按页完整”，父需在冻结时裁定；本建议优先明确“完整修订仍有剩余”这一用户语义，不自称已决。

route候选 **GET `/spaces/:space_id/revisions/:revision`**，revision路径必需正safeinteger，query仅max_bytes/cursor。4096–65536/default12288、cursor TTL86400既定；未知/重复/空/非法参数400。当前身份/空间权限先核，之后不存在的固定修订404。读取只用指定revision，无latest隐式替代，不写事件/幂等/ack。

cursor候选 `{v:1,purpose:'space_revision_read',actor_id,space_id,revision,byte_offset,exp}`，严格额外键拒绝；复用TokenSigner/Clock，绑定actor/space/ref/位置，position须合法UTF8边界且小于未读文档末尾。max_bytes不绑定，可换页大小。推荐首次24h期限续页沿用原exp、不无限续期；坏/tamper/wrongpurpose/space/revision/actor/过期均400 VALIDATION_ERROR、retryable=false、固定去掉cursor重读指定修订提示，不泄漏原材料。当前撤权优先401/403规则，不能用坏cursor绕授权。最终错误/期限细节父冻结。

共享编码函数候选build/serialize/bytes SpaceRevisionEnvelope，形式同A `{api_version:'1',request_id,data,meta}`；core传真实request_id并选择最大UTF8安全chunk，测量真实next_cursor签名与外层二次转义后的候选envelope。route只发同compact编码字符串，不独立裁剪。metadata+至少一个文档字符正常4KiB可推进；最小metadata放不下422 QUERY_TOO_BROAD，不返回空chunk+cursor死循环。cap仅成功compact HTTPbody，不含headers/error/SDK外壳。

## 2. 对比备选：结构化片段页（不推荐本轮）

相同ref/route/预算/cursor绑定，data改 `{ref,segments:[{field:'objective',start_byte,end_byte,text}|{field:'rule',rule_index,start_byte,end_byte,text}],complete}`。objective与每条rule分别UTF8安全切片，空规则与空字符串必须另外定义完成标识，重组规则顺序需固定rule_index。可以省外层JSON文本二次转义部分，但要处理跨field位置、空规则、规则数量与更复杂cursor。为避免本包扩大状态机，推荐方案1；本包至多这两个DTO方案，不提泛化正文框架。

## 3. context固定ref与预算降级

always新增 `space_revision_ref:{space_id,revision}`，取此次readSnapshot里的space.current_revision（内容版），不是独立读取或policy_revision。原objective/rules位置保持：

- `space_content_status:'included'`：objective:string/rules:string[]，原inline行为不迁字段。
- `space_content_status:'omitted_for_budget'`：objective:null/rules:null，两字段整体省略，必须有固定ref；meta.truncated=true。不是历史missing_fields或未知内容，不混用unavailable。

ContextResponseData改Type.Union两完整branch（用共享既有其他字段基底），Meta沿Aboolean/null。父/核心后续对齐顺序：先用空的四可选arrays测inline mandatory；若仍超限则对原完整候选objective/rules两字段一起降null/status omitted，再按A既定activity→failure→blocker→pin尾pop删减可选项。若inline mandatory本来能放下，则保留完整规则、仅删可选项；最低ref/标识/checkpoint等放不下仍422。不能把剩余未测来源状态改false，不能只截rules一部分不说明。HTTP预算与快照/checkpoint继承A；focus仍授权后400。

旧client静态objective/rules将变nullable，必须先看status；这是真实兼容变化，需要例子与类型迁移。正常小context保持string/array但新增ref/status，工具完整page保留。

## 4. Pi/dsh官方与安装事实：不能误报TObject要求

2026-10-03通过官方网页/仓库核对：

- [Pi当前官方扩展类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) 的ToolDefinition泛型是 `TParams extends TSchema`、parameters:TParams，**没有强制TObject**；[官方Extensions](https://pi.dev/docs/latest/extensions)与 [官方校验源码](https://github.com/earendil-works/pi/blob/main/packages/ai/src/utils/validation.ts)是当前来源。当前main不能替代安装合同，也不因此升级。
- 本机安装coding-agent与pi-ai均0.87.1；安装types.d.ts:345–357同样TSchema泛型，:1019 registerTool同边界。pi-ai dist/utils/validation.js实际用typebox/compile与typebox/value，不是AJV。Detuned使用@sinclair/typebox0.34系列，Pi是另一个typebox包，现adaptToolSchema保持JSON约束与联合分支。
- 本轮有限纯schema实验 [schema-probe.json](schema-probe.json)：Type.Union与Type.Intersect均被Detuned Value.Check和安装Pi validator正确识别正/反例。仅空间分页分支接受max_bytes/cursor，post/thread不适用参数与space缺revision被拒；不是假设。
- MCP ListTools的inputSchema要求object根，Detuned现publish/relate已用 `{...Type.Union(branchObjects),type:'object'}`。本轮 [schema-object-root-probe.json](schema-object-root-probe.json)真实验证同根形式，TypeBox与安装Pi正/反例一致。推荐forum_read复用此模式，保留Union Kind、anyOf严格完整Object分支；不要用TObject外加if/then等可能被Value.Check忽略的自造条件，也不把顶层Type.Union无type直接发MCP。
- [dsh官方MCP说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) 与 [官方入口源码](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/src/index.ts)核实MCP客户端桥与schema发现/调用链；dsh package本仓库没有安装/锁定版本，compatibility仍not_tested。本包沿现MCP桥，不安装harness、修改global config或调用模型。官方说明强调stdio可有探测进程与server命名空间，不能靠整个harness启动冒充工具连接成功。

本轮实验仅安装SDK纯校验，无执行/宿主/provider认证；已有A报告的本机Pi校验后executor、MCPstdio实际通信证据可复用其事实，dsh/Codex/Claude/Pi真实宿主模型仍未测。正式实现后需TypeBox/AJV/安装Pi正反例+实际MCP ListTools发现根object+execute读取页，不仅凭文档声明支持。

## 5. forum_read与旧参数的最小兼容面

现ToolReadSchema为宽Object，kind thread/post/artifact/review，任意kind允许revision/cursor/max_bytes1024–65536；client仅实现post/thread，忽略其cursor/max_bytes，artifact/review显式400。建议新增space分支必需revision与id（id须指明目标space），cursor/max_bytes仅该分支，范围沿CONTEXT_BYTES。现post分支保留可省revision；thread分支仅space_id/kind/id，不添加B.2分页。

扁平输入保留，完整branch additionalProperties:false，以anyOf+rootobject公布。space分支 `{space_id,kind:'space',id,revision,max_bytes?,cursor?}`：建议id必须等于外层space_id（纯结构关联无法用普通JSON Schema完整表达），请求仍以scope space_id路由，core明确校验相同，否则400；不能让client把id默默丢弃或跨空间读取。此关联检查由服务业务层拥有；如父希望避免重复id，可另裁空间分支不要求id，但会改变旧统一工具形状。

旧post/thread合法不带cursor/max_bytes输入维持原data返回（不顺带迁全部read输出）；显式携带过去被忽略参数现在400，明确参数未实现、B.2后续。schema应拒组合，绕过SDK的直接callTool也必须显式400，不能只依赖模型参数校验；共享纯结构validator可供client/core复用，但授权/修订读取规则必须服务端。若不新增tool-dispatch HTTP，只在client拒不适用组合属于调用协议校验，不复制权限。artifact/review继续明确未支持，不新增虚假成功分支；是否保留schema旧预览kind由父决定并说明，不把本包变成附件/review实现。

space成功返回SpaceRevisionPage全data/meta，client.getSpaceRevision(spaceId,revision,{max_bytes?,cursor?})静态typed完整page，forum_read space→此HTTP调用。SDK pretty text/details包装不受HTTPcap。旧context已返回page，新增ref/status传播不丢meta。

## 6. CLI必要变更与迁移

CLI index.ts:256–269 context现在printOutput(res.data)；建议改printOutput(res)显示data/meta（--json也同page），说明旧脚本空间字段从顶层迁data，truncated必须可见。--focus-thread仍传后显式400，help标明不支持/省略，不能用参数存在假称实现。

read:298–318当前kind post/thread、id必需、revision可省且只用于post。建议只加kind space，要求显式--revision正整数，--id等于--space或按父裁定去冗余；新增--max-bytes/--cursor只space可用，省略max默认12288；space输出完整page及next_cursor。post/thread带新选项显式报400，不忽略；保持其合法旧data输出。CLI只做结构参数和HTTP复用，不复制授权/过期/修订规则。search与其他commands完全不改。

## 7. 操作目录与旧正式适配事实

新增明确revision GET增加35→36操作，body仍19JSON+1multipart，新route无正文；原G01动态比较全部method/path与OpenAPI无硬编码35，预计无需为计数改测试。ADv2/AE同样由独立方确认动态遍历，先真实执行再判断是否需版本化脚本，不为新增route自动复制历史probe；旧字节保持。

需要父逐项批准的旧正式最小变化（只列当前受规则降级影响的断言，不改文件）：

- tests/contracts/m2-context-contracts.test.ts C01:34：合法1500中文objective/max4096原期待422，将改200 omitted+ref与实际bodycap，65536完整原文控制保留。C04:ContextPage静态与新data union无需弱化meta反例。
- tests/integration/m2-context.test.ts C02:45：合法必保大规则原QUERY_TOO_BROAD改omitted+ref；仍要保留最低metadata巨大request_id:129的422与rawcap临界:119断言，不能整体去掉失败边界。具体budget相关fixture若core字节增加导致临界需重算同源helper，不硬写假字节。
- tests/contracts/cross-interface-contract.test.ts:79的rules读取需先确定included（正常小fixture仍rules数组）；TypeScript nullable编译需判别或expect非null后使用，不删规则语义。
- tests/contracts/m2-knowledge-view-contracts.test.ts ContextResponseData通过新union，正常HTTPcontext断言应增加included/ref控制；现DTO数据schema比较跟随共享定义，无新rootRecord兜底。
- 已核当前29的check-cli.mjs仅执行publish/revise/withdraw，没有context顶层规则断言，不能捏造需适配项；CLIcontext迁移用新正式专项与实际子进程验证。若后续真实执行暴露另一个当前脚本假设，才在新目录版本化适配，不能改历史probe。Cli readspace同为新增契约，不改search输出。现m2-artifacts-cli只serve生命周期，与context输出无关。

新增正式候选 m2-space-read-contracts.test.ts：实际raw4096/65536/default/req.id转义、context omitted→HTTP读固定版重组、页进展UTF8安全/二次转义/并发新版不漂移、meta/工具root分支SDK与MCP/Pi真实路径、CLIcontext/space迁移与非法参数。授权/Clock/游标/快照正式由A负责。不得只因新helper缺失造before；先保存旧context大材料422且无续读的实质限制，后父放行实施。

## 8. 待父冻结与停写

请父最终选择方案1/2、页meta truncated语义、cursor错误/chain TTL、space工具id关联与artifact/review预览schema保留方式、context ref/status命名，以及旧正式适配所有权。B候选protocol spaces/context/tools/serializer/OpenAPI、server新space读取route/app必要接线、client/CLI上述范围、新HTTP/tool/CLI契约与docs04/examples；A持context降级、固定读取/签名/快照/业务 tests与docs03/ADR。无DDL/依赖/模型/全局配置。

规划到此停写，不自行冻结、不实施B.1、更不启动B.2。旧reviews/probes/logs/SQL/schema/archive保持，不commit/push。
