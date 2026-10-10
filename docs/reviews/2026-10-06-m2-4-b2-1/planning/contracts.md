# M2.4-B.2.1 协议/接入只读精确规划

2026-10-06。按父代理冻结的B.1 next-task执行阶段1；当前只读产品/旧正例/官方资料并写本文件。未改产品、正式测试、规范或既有证据；本规划初稿未运行before、测试、build、全套或宿主/模型；下方补记父批准后的before。B.1有限接受276/28/当前29作为起点，不把丢失三历史HTTP原夹具改标成功。before等待独验fresh baseline和父批准。

## 1. 实际路径与加法兼容图

| 现入口/文件 | 当前实质行为 | 本包新增位置及兼容边界 |
|---|---|---|
| server/routes/posts.ts GET posts/:id | query仅revision；调用PostService.getPost，envelope.data={post,revision} | 新增GET posts/:id/revisions/:revision，不改旧getter/目录 |
| 同文件 GET posts/:id/revisions | limit/cursor，data修订目录+meta | 不改裸目录cursor，不聚合正文 |
| core/PostService.getPost:423 | 可省revision取head、redacted410、withdrawn可读 | 独立新服务每页refresh/同snapshot；不借旧getter复制或更改写逻辑 |
| client/client.ts getPost:596 | 旧HTTP完整envelope，request<any> | 新getPostRevisionContent返回typed完整page；无新运行时响应validator |
| client callTool forum_read:784 | space整page，post/thread只data | 新post_revision整page；旧post revision可省，max_bytes/cursor继续禁止 |
| protocol/tools.ts:28 | 三分支union/rootobject+anyOf，shared纯结构校验 | 增第四post_revision分支，不新增tool名字，仍8动作；旧分支字段不变 |
| cli/index.ts:258/314 | space read已存在；顶层read仅post/thread data | post尚无命令，新增post read双位置参数、required revision、完整page；原read不动 |
| protocol/openapi.ts | 旧post/revisions目录和POST修订存在；全目录动态政策遍历 | 新增一GET、无requestBody；预期36→37但实际执行报告，不硬改旧计数 |

当前未见route命名冲突（目录GET与单revision GET不同路径）或CLI post顶层冲突。未见getPostRevisionContent/PostRevisionContentPage/新encoder已存在。server/app.ts已显式构造B.1 service并共用clock/signer/secret，按同组合根新接postRevisionReadService。protocol/index.ts已有posts导出，不另立泛化读取框架。

OpenAPI最后遍历会把所有query cursor暂覆写为NONBLANK_STRING_SCHEMA，B.1已有精确path回置；新路径需同样回置本包strict cursor schema，否则4096chars约束会丢。strict path revision为正safeinteger，route共享parseIntegerQuery(required,min1,maxMAX_SAFE_INTEGER)，query仅max_bytes/cursor并拒未知/重复/空值；业务权限/目标/redaction/cursor留core。

## 2. 提交父代理统一的类型与helper候选签名

以下仅命名/类型候选，行为集合已经父冻结；core与B需父统一后才能实现。最小增量集中protocol/posts.ts，沿B.1纯函数结构，不提取泛化框架：

```ts
PostRevisionContentDocument = {
  title: string; summary: string; body: string; tags: string[];
  structured: PostRevision['structured'];
};
PostRevisionContentRef = { space_id: string; post_id: string; revision: number };
PostRevisionReadQuery = { max_bytes?: number; cursor?: string };
PostRevisionContentPage = { data: {
  ref: PostRevisionContentRef; post_kind: PostKind;
  lifecycle: 'active' | 'withdrawn'; has_newer_revision: boolean;
  encoding: 'json'; chunk: string; start_byte: number; end_byte: number;
  complete: false;
}, meta: { truncated: true; next_cursor: string } } | {
  data: /* same fields, complete:true */;
  meta: { truncated: false; next_cursor: null };
};
PostRevisionContentEnvelope = { api_version: '1'; request_id: string }
  & PostRevisionContentPage;
PostRevisionReadCursorPayload = {
  v: 1; purpose: 'post_revision_read'; actor_id: string; space_id: string;
  post_id: string; revision: number; byte_offset: number; exp: number;
};

encodePostRevisionContentDocument(document: PostRevisionContentDocument): string;
buildPostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): PostRevisionContentEnvelope;
serializePostRevisionContentEnvelope(requestId: string, page: PostRevisionContentPage): string;
postRevisionContentEnvelopeBytes(requestId: string, page: PostRevisionContentPage): number;
validatePostRevisionReadQuery(query: PostRevisionReadQuery): void;
isPostRevisionReadCursorPayload(value: unknown): value is PostRevisionReadCursorPayload;
POST_REVISION_READ_LIMITS = { cursor_chars: 4096, cursor_ttl_seconds: 86400 };
POST_REVISION_CURSOR_ERROR_MESSAGE = 'Invalid or expired post revision cursor. Remove cursor and retry the same fixed revision.';
```

相应*Schema与Static导出由protocol唯一提供。document只编码stored投影，不套CreatePost或NewTypedStructured校验，字符串/数组读合同不加新写长度限制，不补历史字段、trim、默认或删structured额外键。structured可沿现历史StructuredContentSchema的Record fallback表示；实际encoder固定顶层顺序JSON.stringify({title,summary,body,tags,structured})，不深层重排、不冒充content_hash。page lifecycle成功域仅active/withdrawn，redacted是410错误，不能借PostLifecycleSchema在成功页允许redacted。

cursor payload所有键required、additionalProperties:false；revision/offset正safeint、exp非负safeint。page/envelope严格完整相关union，非末cursor非空，metadata只含冻结字段；schema不伪称验证chunk offset的算术或UTF8，core/真实正式断言执行这些规则。

core边界候选与父指令一致：

```ts
PostRevisionReadService.getRevision(auth, spaceId, postId, revision,
  query: PostRevisionReadQuery, budget: { request_id: string }): PostRevisionContentPage;
DetunedClient.getPostRevisionContent(spaceId: string, postId: string, revision: number,
  query?: PostRevisionReadQuery, opts?: { signal?: AbortSignal }): Promise<PostRevisionContentPage>;
```

client复用request，保data/meta/Signal与既有取消错误规则；不复制revision存在性/ACL/生命周期/签名/TTL。直接callTool先共享validator，post_revision要求kind,space_id,id,revision且只max_bytes/cursor可选；rootobject+anyOf/UnionKind机制保持。tool描述明确旧post不预算、新post_revision固定内容页。

CLI新增`detuned post read <space-id> <post-id> --revision N [--max-bytes N] [--cursor TOKEN]`，可复用现parseReadPositiveInteger；help写4096..65536/default12288/拼接后解析。revision拒后缀/小数/unsafe，预算语义业务层校验；合法旧read/search/space/context输出不迁移。

## 3. 旧正式正例与必要适配判断

当前没有发现必须修改的旧正式断言，不申请弱化/重写旧tests：

- tests/contracts/r4-c-route-contracts G01逐实际method/path与spec动态比较，也动态遍历path参数/body absence；新增route同时新增OpenAPI后自然匹配，未硬编码36。G02明确旧GET posts/:id的revision query等于REVISION_QUERY，应原字节保持。新path/query严格合同放新专项。
- tests/contracts/m2-space-read-contracts R04否定的post cursor/max_bytes、thread revision、space多id、artifact/review仍无效；没有否定post_revision的断言，不需适配。R05/B.1 page/schema不改。
- cross-interface仍断言8个tool名字；新增kind不是第9tool，原名字顺序不变。context/publish旧成功语义保留。
- m1-discussion真实旧GET post?revision=1及POST修订正例不改。旧r4-c旧GET revision=1bad/显空400保留。m2-typed-write对现三新写body政策schema比较与正文validator不改。
- schema.test/m0-m1 adapter工具名字/read注册合同无需改。现读取宿主adapter使用公共DETUNED_TOOLS与callTool；不改Pi/MCP adapter路径，只新专项验证真实新分支与旧post正例。

新tests/contracts/m2-post-revision-read-contracts.test.ts计划覆盖实际raw4096/65536/default与req.id双转义、client静态page/Signal、fixed old ref重组、完整schema关联矛盾、strict tool分支/旧post正例不变、动态新增HTTP/OpenAPI参数；实际CLI/Pi/MCP新kind和旧正例由父按正式与独验边界分派。父明确禁止先跑before，本阶段没有以缺helper/import制造反例。before可用新route404与新kind纯结构/directcall400的实质观测，及合法旧大body成功正文超过4K的事实对照；真实CLIbefore若运行需保存实际exit/stdout，不把源码“post不存在”当实跑。

## 4. 官方和本机安装版重新核查

本轮通过web只读打开integrations中的官方链接：

- [dsh MCP官方README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)：当前仍一server一entry，工具server namespace、stdio/streamable-http、无默认server、stdio临时探测进程；调用取消与错误可见。只是上游当前说明，不是Detuned实测dsh。
- [Pi Extensions官方说明](https://pi.dev/docs/latest/extensions)：registerTool及公开扩展类型链接仍是工具入口；当前另有registerMcpServer能力，不据此改变本项目原生HTTP扩展路线。
- [Pi main扩展类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)：当前execute最后ctx是ExtensionToolContext；与本机安装0.87.1的ExtensionContext有差异，不能按主线猜安装版签名。

本机只读metadata核对：packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent实际symlink解析到pnpm的0.87.1包，package.name/version确为@earendil-works/pi-coding-agent/0.87.1；依赖同目录pi-agent-core/package.json实际0.87.1。安装types.d.ts:345/373为TSchema（来自typebox）、parameters:TParams、execute(toolCallId,params,signal,onUpdate,ctx:ExtensionContext):Promise<AgentToolResult>。现adapter adaptToolSchema保原JSON Schema，跨TypeBox仅类型边界；注册execute透传client结果到pretty content与details，Signal/错误不改。pi-ai/dist/utils/validation.js:280提供已装validateToolArguments，可后续用安装版真实validator→execute验证rootobject+anyOf新分支，不能将只看types称编译通过。

只读hash：coding-agent/package.json=`627631b613ba4ca29eba8df793f5280fd20b19f01d73826e9ffda14c15def5dc`；types.d.ts=`14d00e645b453f4361440da6fcda86ed6cef9a8fc36d483a621a0250e0d4a396`；pi-agent-core/package.json=`26f991ea26187d52978c303811f32032c9fcdaec197d4dcf08d793bedffdb87c`。

当前PATH未发现pi/dsh可执行文件；基于项目adapter解析上下文未resolve dsh及dsh-mcp-client包。不能据此证明用户所有位置绝无安装，只能记录本轮可见环境无可执行宿主路径，dsh实际版本/真实宿主验证not_tested。首次CJS require.resolve Pi遇ERR_PACKAGE_PATH_NOT_EXPORTED是该包仅import导出的解析限制，不是未安装；随后直接读symlink package metadata纠正。某次只读rg glob无匹配与误指不存在B.1工具脚本未影响产品或运行测试，本轮没有安装/启动宿主、全局配置修改或模型调用。

## 5. 边界与下一步

未来所有权限父批准：protocol/posts相关DTO/encoder/payload、tools/OpenAPI；server/app.ts与routes/posts.ts新增route；client/client.ts新方法/dispatch；cli/index.ts新post read；新contract专项；docs04与新examples/post-revision-read.md。旧正式tests未经逐项父批准不改；core的新service/业务tests/docs03/ADR由core单元独占。旧SQLite写行为、PostService写validator、旧getter/目录不动；不清理依赖/dist/旧证据、不commit/push。

父需统一上列导出命名和固定游标错误提示，再fresh baseline→至少两实质before→实施放行。无当前安全/架构冲突。docs04行63仍将旧GET post标cursor/max_bytes规划，应在获准实施时同步为实际旧GET revision? +新固定revision route；不提前改。完整T06/M2.4/M2、B.2.2主题目录/聚合、review/artifact/M3、真实宿主/模型与100k均不在此阶段成果中。

### fresh baseline后的窄before授权

父已确认fresh baseline：123source、34docs、5mutable与2344旧review（含B.1），4SQL、2schema；计数不沿用B.1旧manifest。现批准在implementation/protocol保存实质before，不改正式tests/产品/build。导出命名按父统一修为PostRevisionReadQuery与validatePostRevisionReadQuery；其余上述签名保持。before执行后记录真实证据并停等实施信号。

### 父最终导出与before记录

父依据planning/core.md冻结：PostRevisionContentDocument是Pick现PostRevision五字段；PostRevisionContentPage/Ref/Envelope、PostRevisionReadQuery/CursorPayload及上述encoder/envelope/bytes/query-validator/typeguard名字共同冻结，无其它接口候选重新开放。cursor固定提示为`Invalid or expired post revision cursor. Remove cursor and retry the same fixed revision.`，预算复用CONTEXT_BYTES。见新interface-freeze.md。

父批准后实际运行新before.mjs（使用已有本机dist/in-memory SQLite，不build、不改正式tests）。首次exit1是开发者夹具读取initial_post.id，实际嵌套为initial_post.post.id；错误ID使旧GET404而期待200，属于before脚本错误。保留before-first的stdout/stderr/command元数据。仅修脚本取ID后同四项观测完成exit0：新route404、合法旧全文GET200且实际29,492bytes>4096/no meta、新post_revision工具kind400、CLI unknown command post/exit1。四项是本机HTTP inject/client直接callTool/CLI真实子进程观测，不是Pi/dsh宿主实测。凭据只在内存，不落仓库；脚本与输出位于implementation/protocol。完成后停等父实施信号。
