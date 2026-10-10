# M2.4-B.2.2 接入阶段1契约与兼容图

2026-10-06。已读仓库入口、docs00/08/11、当前状态、B.2.1 next-task与本包core.md；唯一行为冻结以[B.2.1任务书](../../2026-10-06-m2-4-b2-1/next-task.md)为准。本阶段仅写此规划；未改产品/正式tests/规范，未运行before、tests或build。起始293/30/current29只是上包接受状态，fresh保护计数待独验重新捕获。

## 精确接入与旧兼容

packages/protocol/src/threads.ts持有现ThreadSchema；posts.ts持有现PostSchema，protocol/index已export threads。新增页直接复用现Thread/Post metadata，无正文或新生命周期过滤。packages/server/src/routes/threads.ts现GET threads/:id接受limit/cursor并调用storage.listPostsInThread；client/client.ts:559 getThread返回旧envelope，旧forum_read thread在:802取data；cli/index.ts旧read thread同样取data且不暴露目录分页。这些合法输出及裸id cursor保留，不能将新签名语义施加旧路径。

新GET /spaces/:space_id/threads/:id/posts与routes/posts.ts现POST同路径不同method，OpenAPI在openapi.ts:268同一path对象中增get，保post及body政策。server/app.ts当前构造B.1/B.2.1读取服务；未来新增ThreadPostsReadService依赖顺序storage/tokenSigner/authService/tokenSecret/clock，并传给threadRoutes。route只做严格transport解析，业务授权/签名/预算留core，成功使用共享serialize，实际req.id不换占位。

query仅limit/cursor/max_bytes：limit复用THREAD_POST_LIMIT 1..100/default50；max_bytes复用CONTEXT_BYTES 4096..65536/default12288；cursor非空至多4096。重复/未知/空参数拒绝，数字沿现safe十进制解析。OpenAPI通用NONBLANK参数处理会覆盖cursor，须在现B.1/B.2.1恢复分支旁恢复新path的cursor schema；不更改旧GET thread政策。

SQLite真实路径packages/storage-sqlite/src/sqlite-storage.ts:718–748已有thread_id参数化、id > ?、id ASC、limit+1，返回至多limit metadata和裸next_cursor；无需Port/SQL/DDL。id是字典序，不是创建时间；动态跨页并发较小新id可能本轮漏见，事件增量补充。新服务只用storage next_cursor判断有更多，不能签其原位置而跳过预算删掉的尾项。

## 共同导出候选（父统一后冻结）

```ts
type ThreadPostsReadQuery = { limit?: number; max_bytes?: number; cursor?: string };
type ThreadPostsReadCursorPayload = {
  v: 1; purpose: 'thread_posts_read'; actor_id: string; space_id: string;
  thread_id: string; sort: 'id_asc'; after_id: string; exp: number;
};
type ThreadPostsPage = /* data:{thread:Thread;posts:Post[]}, correlated meta */;
type ThreadPostsEnvelope = {api_version:'1';request_id:string} & ThreadPostsPage;
buildThreadPostsEnvelope(requestId:string,page:ThreadPostsPage):ThreadPostsEnvelope;
serializeThreadPostsEnvelope(requestId:string,page:ThreadPostsPage):string;
threadPostsEnvelopeBytes(requestId:string,page:ThreadPostsPage):number;
validateThreadPostsReadQuery(query:ThreadPostsReadQuery):void;
isThreadPostsReadCursorPayload(value:unknown):value is ThreadPostsReadCursorPayload;
THREAD_POSTS_READ_LIMITS = {cursor_chars:4096,cursor_ttl_seconds:86400};
THREAD_POSTS_CURSOR_ERROR_MESSAGE:string;
```

对应ThreadPostsReadQuerySchema/ThreadPostsReadCursorPayloadSchema/ThreadPostsPageSchema/ThreadPostsEnvelopeSchema由protocol唯一导出。错误固定去cursor重读第一页文案待父统一，不另开架构候选。core签名与core.md一致：ThreadPostsReadService.getPosts(auth,spaceId,threadId,query,{request_id}):ThreadPostsPage。

page严格三分支：true + 非空posts + 非空cursor；false + 非空posts + 非空cursor（仅limit有更多）；false + posts可空 + cursor null。无complete字段。meta.truncated仅预算删项，不等于所有剩余。每次候选按最后实际发送post.id签名，storageHasMore或budgetRemoved决定续读；有候选但一post及必要cursor放不下422，不返回空进展。空主题thread metadata仍计完整envelope预算，fit则[]/false/null，否则422。

cursor strict所有required且拒extra、purpose/actor/space/thread/sort绑定；after_id非空仅参数化下界，不要求当前row存在。首exp24h，后页沿首exp，不绑limit/budget；等号有效、+1过期、未来超过当前24h拒绝。每页refresh身份→space→thread归属→query/cursor→同snapshot目录；编码后不再DB。Thread版本/state与Post head/lifecycle为本页snapshot，跨页动态，不声称固定全集。

## client、工具、CLI

新增getThreadPosts(spaceId:string,threadId:string,query?:ThreadPostsReadQuery,opts?:{signal?:AbortSignal}):Promise<ThreadPostsPage>，复用request完整data/meta/取消与错误，不复制业务规则。forum_read新增kind thread_posts，space_id/id必需，limit/max_bytes/cursor可选，revision及extra拒绝。仍8工具名，保rootobject+anyOf/UnionKind和共享纯结构validator；旧thread不接受新分页参数。新描述明确旧工具thread只默认首批metadata、新kind有界目录，不承诺全文聚合。

当前CLI无thread顶级命令，新detuned thread posts <space-id> <thread-id> [--limit N] [--max-bytes N] [--cursor TOKEN]无命名冲突。复用parseReadPositiveInteger拒数字后缀/unsafe，输出整page，help区分旧read thread与新目录、limit/预算/签名cursor。不改旧read/search/post/space/context输出。目录current_revision可接B.2.1固定正文续读，example展示旧固定正文/head更新/脱敏410，不聚合正文。

## 旧正式断言与新增验证边界

没有发现必须改变的旧正式断言。r4-c-route-contracts G01动态遍历methods/path，新增spec与route自然匹配；G02仍精确断言旧GET thread limit政策。B.1 R04旧thread revision和旧post分页负例继续非法；B.2.1 P04带revision/max_bytes的旧thread负例继续非法。cross-interface及B.2.1工具名单仍8项。旧m1目录/正文正例、旧barecursor语义均保留；若后续发现具体冲突须先报父，不为新kind弱化旧断言。

未来仅新增tests/contracts/m2-thread-posts-read-contracts.test.ts：实际HTTP compact外层JSON4K/64K/default与真实request_id cliff；完整page schema三分支反例；client Signal/fullpage和新tool strict branch/旧thread正例；动态OpenAPI新增GET并保POST；目录metadata衔接固定旧正文。静止全ID无重漏、预算尾裁/原storage无next、TTL/ACL/WAL/只读fingerprint由core专项与独验共同实测。Pi安装validator/MCPstdio/CLI完整多页由独验分派；不提前运行。

## 官方依据与重新核安装

复用本日B.2.1 planning/contracts.md已经实际web打开的[dsh MCP官方README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)、[Pi extensions](https://pi.dev/docs/latest/extensions)、[Pi main types](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)，本阶段没有重复web打开，不将复用记成新抓取。上游Pi main execute为ExtensionToolContext，安装0.87.1为ExtensionContext；当前官方registerMcpServer不改变本项目HTTP原生扩展架构。

2026-10-06本阶段重新只读resolve symlink/读package metadata及SHA256：coding-agent和pi-agent-core仍实际0.87.1；coding-agent/package.json 627631b613ba4ca29eba8df793f5280fd20b19f01d73826e9ffda14c15def5dc，dist/core/extensions/types.d.ts 14d00e645b453f4361440da6fcda86ed6cef9a8fc36d483a621a0250e0d4a396，pi-agent-core/package.json 26f991ea26187d52978c303811f32032c9fcdaec197d4dcf08d793bedffdb87c，三hash与本日上包相同。实际validator沿已装pi-ai/utils/validation，不用CJS exports解析失败推断未安装。

本轮PATH shutil.which(pi/dsh)均None；dsh本地可见环境无宿主路径，真实dsh安装版本/四宿主实测仍not_tested，不证明全机绝无安装。不安装/global修改/启动宿主/调用模型。只读搜索曾误指packages/storage/src路径及cross-interface.test.ts，随后rg --files定位真实storage-sqlite与cross-interface-contract.test.ts；未影响产品或证据，无测试运行。

## 阶段结论与停写

未发现冻结行为与现接口的架构冲突。未来所有权仅protocol threads/tools/openapi/index必要导出、server app/threads、client/CLI、新contract、docs04/example及新implementation/protocol证据；core独占服务/业务tests/规范与ADR。现仅本文件获准，等待父统一导出/错误文字、freshbaseline及before授权。保护全部旧证据/依赖/dist，不commit/push/清理。B.2.2尚未实现，完整M2.4/T06/M2、focus与规模验收不报完成。
