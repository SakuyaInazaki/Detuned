# M2.3 Unit B 协议/传输合同草案

2026-10-03，仅只读事实与规划，未改产品/正式测试、未build或跑产品suite。已读最新AGENTS/README/docs00/08/11及03/04/09、M2.2-B next-task/facts。父代理批准后才实施；旧review/probe/log/SQL/schema/archive保持。

## 当前事实与必要迁移

- logical SearchQuerySchema/ToolSearchParamsSchema 的 tags 为Array(String)，没有数量或元素长度限制。HTTP写帖子tags最多20个、元素maxLength48；工具publish没有这些限制，core按原数组存储。因此不能无声地让搜索query继承20/48而使旧长tag不可查询。本包不强化写入规则。
- HTTP tags CSV只有一个scalar，整体trim、split(',')、逐项trim、丢空项；空串→[]，重复参数拒绝。client目前join(',')会破坏合法tag中的逗号和首尾空格。新增tags_json解决无损数组传输，不把它并入业务payload或存储。
- q旧schema min/maxLength1–256，TypeBox.Value.Check按UTF16 value.length，安装版Fastify AJV8.20.0默认ucs2length按码点；core和storage也用UTF16 length。只读纯validator实验（无产品调用）：129/256个emoji旧schema TypeBox拒/AJV通过，257双方拒。必须同时修逻辑schema与core码点规则，不能只改server。
- client.search返回request<any[]>，forum_search取.data丢meta；MCP把callTool结果JSON文本输出，Pi把同一结果JSON文本/details输出，无各自分页业务。改forum_search为client完整{data,meta}是可观察的旧数组→对象迁移，不能藏数组属性或隐瞒。HTTP data保持数组。
- 当前正式tests只断forum_search名称存在，没有结果数组断言；相关当前29 adapter probes未发现forum_search结果调用依赖。CLI search仍只打印res.data且没有cursor option，本包不借此添加CLI分页功能；新工具/HTTP/client是分页入口。

## 父已批准的数量与承载边界

建议保留逻辑tags无单tag/maxItems新限制，设置dedup后最多100个query tag及tags原数组JSON编码UTF8最多8192字节，再设置tags_json**URL解码后原字符串**UTF8最多8192字节，JSON.parse前检查；cursor最多4096个ASCII token字符。carrier限制是新query资源边界，不是标签写入规则。tags_json raw JSON的转义字符算原carrier字节，不能先parse/restringify绕过；协议OpenAPI用x-max-utf8-bytes准确声明，不把JSON Schema maxLength谎称UTF8字节。URL本身仍受部署HTTP解析器限制，carrier上限不承诺任意编码后的URL均可达。

## 唯一共享逻辑定义与HTTP表

protocol/search.ts 提供 SEARCH_QUERY_POLICY（q码点1–256、tags_json8192、cursor4096、共享limit、候选5000/结果items JSON262144）；SearchFilterSchema 为kind?:PostKind、tags?:Array(String)、thread_id?:非空白String。SearchQuerySchema复用同一q/filter/limit/cursor定义，不含tags_json（它只是HTTP carrier）。ToolSearchParamsSchema复用字段定义，保留space_id与filters嵌套形状；不重新写一套q/tag限制。未知字段拒绝。

| 字段 | HTTP scalar/逻辑行为 | 归一化与错误 |
|---|---|---|
| q | 必需String；trim后1–256 Unicode码点 | 只trim，不NFC/fold；空/全空白/超限400；不改变有意义文本 |
| kind | 可省，已有POST_KINDS枚举 | ''/空白/非法枚举400，不trim成合法枚举 |
| tags | 可省，一个CSV String | 保留整体/逐项trim与丢空项；''/空白/逗号空段→[] |
| tags_json | 可省，一个String，≤8192 UTF8候选，JSON Array(String) | ''/空白/坏JSON/null/object/非string元素400；[]无筛选；不trim元素，空串/空格/逗号均按原tag文本保存 |
| tags+tags_json | 以字段presence互斥，包括tags=''和tags_json='[]' | 同时出现400，不能选优先级或合并 |
| thread_id | 可省非空白String | 保留原内容，不trim为另一个ID；空/全空白400 |
| limit | 可省默认20，1–100 | 原parser：trim后十进制digits、安全整数；0/负/小数/非数/空400；签名不绑定limit |
| cursor | 可省非空白String，最终token结构/长度由core在当前空间授权后检查 | 旧裸ID/坏token/过期/绑定不符均400 VALIDATION_ERROR false，固定提示去掉cursor重取第一页 |

允许HTTP键只有q/kind/tags/tags_json/thread_id/limit/cursor；所有重复scalar（包括tags_json）、unknown keys拒绝。tags数组查找语义为所有**精确、区分大小写**元素同时存在；[]/省略无筛选，重复tag由core去重，hash归一时JS字典序排序，不trim/fold。JSON数组与CSV都传同一逻辑tags给core，不在route复制查询或权限逻辑。

### q的跨validator码点表达

共享SearchQStringSchema使用以下pattern，不再使用有分歧的min/maxLength：

```text
^\s*(?=[\s\S]*\S)(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|[^\uD800-\uDBFF]){1,256}\s*$
```

显式代理对与不重叠fallback让无u的TypeBox和有u的AJV都按码点计数，不让两条替代分支把代理对重复计数产生歧义。core仍用Array.from(trimmed).length执行同一政策。纯schema实验256emoji、256emoji+外围空白双方通过，257拒绝，空/全空白拒绝；不是产品FTS行为证据。最终正式合同还需安装版Pi/AJV的正反例，避免宿主预校验提前挡合法emoji。OpenAPI q参数复用同一schema，并将原JavaScript code-unit文案/x-trimmed-length改为明确Unicode码点。

## 签名cursor已预裁定接口

载荷 `{v:1,purpose:'search',actor_id,space_id,query_hash,sort:'id_desc',before_id,exp}`；query_hash = 标准sha256(canonicalJson({q:trimmed,filters:{kind:null|string,thread_id:null|string,tags:dedup.sort()},sort:'id_desc'}))。不复制原q/tags，不绑定limit，不新增表或自造crypto；A复用HasherPort、HmacTokenSigner与实例secret，TTL24h。现签名dataB64.hmac，两段base64url；protocol可暴露纯载荷shape/schema或guard，A做signature/currentACL/expiry/hash绑定，不在server/client重复。

未知字段、错误类型、版本/purpose/sort、签名、actor/space/hash/位置、过期与旧裸ID按父预裁定400 VALIDATION_ERROR、retryable=false、固定第一页提示，不回显原q/tags。当前空间权限先于core cursor处理与候选读取；route仅做现传输scalar解析，不提前解码/验证签名。旧裸ID明确重取第一页，无无签名fallback。ID DESC稳定键集，不是时间/相关性排序，也不保证搜索快照。

## 返回类型与工具meta迁移建议

- SearchResponseDataSchema = Array(SearchResultItemSchema)，不改变原item字段/snippet位置。
- SearchResponseMetaSchema = Object({truncated:Literal(false),next_cursor:Union(SearchCursorStringSchema,Null)})；分页more不是context内容truncated，超预算拒绝，不悄悄裁一页假称无更多。
- SearchPageSchema = Object({data:SearchResponseDataSchema,meta:SearchResponseMetaSchema})，对应client.search静态返回；client底层request泛型meta维持既有实现，本包只给search准确返回边界，不升级全client。
- HTTP200 envelope含必需meta，共享OpenAPI schema挂接；现server route保持无serializer，返回data数组+meta。client始终JSON.stringify(query.tags)为单tags_json，不再join CSV；未提供tags则不发送carrier。
- forum_search返回完整SearchPage `{data,meta}`；MCP/Pi原callTool桥自动保留meta，不改adapter/工具数量或自行算cursor。旧消费者从result数组迁移到result.data，续页用result.meta.next_cursor按原q/filter调用，省略/清空cursor重取第一页。描述/示例必须明确这项可观察变更。

父已倾向并要求解决toolmeta丢失，父已批准此返回shape。未发现当前正式断言或当前29旧probe依赖旧tool数组，需要新增实际HTTP/client/MCP与Pi受控调用证明；不得为维持绿灯修改旧probe。

## 验收与所有权候选

新 `tests/contracts/m2-search-contracts.test.ts`：TypeBox/安装版AJV/Pi q 256emoji/257/trim/空白；逻辑与HTTP数组carrier不截空格/逗号/空串、CSV兼容、互斥/重复/非法JSON/非string/UTF8 8192边界；HTTP正式响应与OpenAPI共享schema一致；client URL与meta类型、真实client/callTool分页；安装MCP stdio工具调用结果保留data/meta。真实业务标签全部匹配、中文/符号/码点分支/分页/权限/生命周期/预算由A与独立验收，不把纯schema实验当业务结果。无真实模型/宿主认证。

当前旧正式断言：r4-c-route-contracts G03仍要求tags CSV style=form/explode=false、空tags200、parseCsvQuery(' a, ,b ')→['a','b']；保留全部。r4-c-contracts重复tags/cursor400、非法kind400不变。没有旧裸cursor成功、tool搜索结果数组或按UTF16拒绝emoji的正式断言需改。若后续全量出现兼容冲突，先报父，不改历史探针或放宽政策。

B候选所有权：protocol/search.ts、tools.ts必要Search字段复用、request-policies.ts必要搜索文案/常量、openapi.ts；server/routes/search.ts与utils/query.ts窄JSON carrier parser；client/client.ts search/callTool结果；上述新契约test；docs04/examples/search与implementation/protocol证据。A独占core搜索/cursor/ports与storage实现。CLI/MCP/Pi业务无需修改，新工具/FTS表/DDL不在范围。最终实施所有权已由父代理批准，见interface-freeze.md。

预算父预裁定5000候选与搜索items JSON256KiB，超限422 QUERY_TOO_BROAD；不是SQLite VM/CPU硬限、整个envelope或context预算。本包不完成M2.4、不跑10万压测，不改变原历史写入hash与M2.2投影。


## 原生HTTP与Unicode边界证据

[validator-experiment.json](validator-experiment.json)保存ASCII256/257、emoji256/257、外围空白、内部换行、组合字符256/258及全空白在TypeBox与AJV unicodeRegExp=true/false下的一致结果；组合字符按码点而非字素，未NFC。只运行独立schema核实，不是产品FTS测试。

[native-transport-experiment.json](native-transport-experiment.json)为Node26.3.0原生临时IPv4 loopback（非产品）：当前native maxHeaderSize16384；8191字节中文tags_json+256emoji q+40字符可信ID产生的448字符cursor，URL28177bytes→431；换4096cursor后URL31825bytes→431。32KiB与64KiB均200，32KiB仅少量header余量。Fastify安装server.js直接传options.http给http.createServer，产品未配置此字段。父已批准app固定http.maxHeaderSize65536，支持上述search wire/正常headers；不保证无限header、任意raw外围空白或任意超长ID。正式验收必须用真实app+client long URL，不能以此native实验代替。

默认可信ID来自CryptoIdGenerator(prefix+UUID)，act/spc/pst均40字符；哈希载荷示例签名cursor448字符，4096上限充足。不为此新增ID写入限制。
