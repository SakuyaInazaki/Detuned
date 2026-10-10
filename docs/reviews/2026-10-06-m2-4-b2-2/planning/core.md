# M2.4-B.2.2 核心阶段1：只读路径与精确接口

2026-10-06。已读AGENTS、README、docs00/08/11、progress与上包next-task唯一父冻结方案。起始293/30/current29，三遗失原历史HTTP夹具仍not_run；fresh保护清单由独验动态捕获，不复制2344。仅本planning写入，不改产品/正式tests/规范、不运行before/tests/build。

## Port足够与现keyset事实

core/ports/storage.ts:55/92/104现有readSnapshot、findThreadById、listPostsInThread。sqlite-storage.ts:718–748以thread_id=?、after裸字符串id>?, ORDER BY id ASC LIMIT limit+1；返回至多limit项，另以next_cursor是否null表示还有更多。Post字段完整为id/space_id/thread_id/author_id/kind/current_revision/lifecycle/created_at。findThreadById:486返回现Thread字段。不需Port/scan/DDL/SQL/旧写入变更。

无lifecycle过滤，目录包含active/withdrawn/redacted；Thread open/archived均可读。返回只有metadata，不调用getPostRevision取正文，redacted正文不会经目录泄出。id来自randomUUID，升序是字典keyset不是时间顺序，不保证并发新增较小id在下页看到。

## 唯一窄服务与snapshot

候选类`ThreadPostsReadService`，constructor(storage,signer,authService,secret,clock)同前两包，无环境读取/隐式时钟；方法：

```ts
getPosts(auth:AuthenticatedContext,spaceId:string,threadId:string,
  query:ThreadPostsReadQuery,budget:{request_id:string}):ThreadPostsPage
```

每页同步readSnapshot：refresh当前身份→space observer/read→findThreadById且所属space否则404→strict query/budget/cursor签名+绑定+Clock→listPostsInThread(threadId,limit,after_id)。snapshot保留完整现Thread、候选Post metadata、storageHasMore、actor/maxBytes/exp。退出后仅sign/encode/裁项，无DB再读。旧route授权与list未同snapshot，不能复用为新业务保证；不改旧route/裸cursor/旧tool输出。

thread state/version与post head/lifecycle本页一致，跨页动态可变，无跨页固定全集、长事务或snapshot对象。after_id只作parameterized下界，不require findPost存在；合法签名lowerbound目标删除后仍可续读，不新过滤或造queryhash。

## 预算裁剪精确逻辑

候选至多100项。storageHasMore=(原next_cursor!==null)，仅使用这个布尔，不把原cursor用于签名位置。先构造全部候选page；more=storageHasMore||budgetRemoved。more且posts非空→cursor重签last实际发送id（sort id_asc与首exp）；不more→null。meta.truncated=budgetRemoved，仅limit有更多仍false/nonemptycursor。

每次完整shared envelope计真实req.id/metadata/JSON转义/签名cursor，不fit就pop尾项、budgetRemoved=true后重建cursor并复测，直到fit。原storage.cursor=null但预算删项仍more；原storage limit+1 last较后不能跨过未发尾项。静止集合用last发送id为下界可完整无重漏。

原本空候选构造posts[]/false/null，metadatafit则返回，否则422；原本有候选不得裁成empty后返回，即使empty能fit也422。至少一post与其必要cursor无法fit则422 QUERY_TOO_BROAD，无空页循环或不可消费超长cursor。不引入字节二分或通用框架，≤100次候选重测是冻结范围内可接受工作；不是SQLVM/CPU硬cap。

## protocol所需唯一导出（交父统一）

```ts
type ThreadPostsReadQuery={limit?:number;max_bytes?:number;cursor?:string};
type ThreadPostsReadCursorPayload={v:1;purpose:'thread_posts_read';actor_id:string;
  space_id:string;thread_id:string;sort:'id_asc';after_id:string;exp:number};
type ThreadPostsPage=/* {data:{thread:Thread;posts:Post[]},meta}完整分支 */;
type ThreadPostsEnvelope={api_version:'1';request_id:string}&ThreadPostsPage;
buildThreadPostsEnvelope(requestId:string,page:ThreadPostsPage):ThreadPostsEnvelope;
serializeThreadPostsEnvelope(requestId:string,page:ThreadPostsPage):string;
threadPostsEnvelopeBytes(requestId:string,page:ThreadPostsPage):number;
validateThreadPostsReadQuery(query:ThreadPostsReadQuery):void;
isThreadPostsReadCursorPayload(value:unknown):value is ThreadPostsReadCursorPayload;
THREAD_POSTS_READ_LIMITS={cursor_chars:4096,cursor_ttl_seconds:86400};
THREAD_POSTS_CURSOR_ERROR_MESSAGE:string;
```

对应schema由protocol持有。预算复用CONTEXT_BYTES、limit复用THREAD_POST_LIMIT。payload strict unknown拒绝，after_id非空字符串；first exp=floor(clock秒)+86400，后cursor沿首exp、limit/maxbytes不绑、等号有效/+1拒、future>now+24h拒。统一坏cursor400非重试固定去cursor重读第一页提示，精确文案待父统一。

page/schema不得错误沿用B.2.1 complete/truncated相关性：目录无complete字段。建议精确表达truncated=true→posts至少1+next非空；truncated=false可完整末页null（允许空）或limit仍有更多非空cursor（posts至少1）。这是父行为的纯结构表达，不另选架构。

## 兼容与所有权

新GET threads/:id/posts对应已有POST同path但不同method，没有冲突；协议接入单元新增server/DTO/client/getThreadPosts/forum_read thread_posts/CLI thread posts。旧GET thread/getThread/旧forum_read thread与CLI read合法输出及裸cursor不改。无需改旧正式断言；若实际dynamic route目录变化或类型冲突需改旧test，先列精确断言给父，不弱化旧语义。

本单元候选独占新core/services/thread-posts-read-service.ts、core/index必要导出、新tests/integration/m2-thread-posts-read.test.ts、docs03、ADR下一号（现末ADR029，实施时再核）。目前仅本planning获准；不提前产品import/helper。

## before及后续专项

待父baseline/before批准：旧合法HTTP getThread limit100的完整metadata envelope可>4KiB，且raw cursor/当前tool只能首批data事实真实保存；新route404/newkind/CLI缺由协议方，不用缺helperimport充反例。

实施后有限新业务专项覆盖：静止多页无重漏、limit1/100/default、budget/limit变化；预算裁剪原storage无next仍续读与hasMore原last不得跳；empty false/null、大thread元数据或一post无法容纳422；redacted/withdrawn/archivedmetadata不泄正文；strict payload/当前ACL/签名下界不存在仍合法；两非末页Clock推进沿首exp/等号/+1；WAL barrier一次thread+posts当前metadata一致/次页变化；目录ref→B.2.1旧body固定/head更新/脱敏410；全库fingerprint成功/错误无event/idem/ack/entity写。真实SDK/HTTP/CLI/Pi/MCP跨入口由协议/独验覆盖，不跑模型/全套/长负载。

未发现父冻结行为与现Port的实质冲突。停写，等父统一精确名字及before授权；完整M2.4/T06/M2、focus/规模验证不在本阶段报完成。
