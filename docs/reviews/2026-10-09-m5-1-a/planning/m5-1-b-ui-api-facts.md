# M5.1-B UI/sharedclient 可实施事实（只读，2026-10-09）

只核相关client/protocol/core与docs01/02/09，不运行测试/浏览器、不修改产品；UI路线由父冻结。

| 调用（client.ts） | 返回/边界 |
|---|---|
| listSpaces(20,cursor,{signal}) :~688 | legacy {data:any[],meta?}，保meta.next_cursor，不假造严格运行响应validator |
| listThreads(S,'open',20,cursor,{signal}) :~721 | 同legacy目录信封；state open/archived，limit1..100默认20 |
| getThreadPosts(S,T,{limit:50,max_bytes:12288,cursor},{signal}) :~730 | typed ThreadPostsPage={data:{thread,posts:Post[]},meta:{truncated,next_cursor}}；仅帖子元数据、不含完整正文 |
| getPost(S,P,revision,{signal}) :~773 | legacy {data:{post,revision},meta?}，省revision取current；明确revision固定读，非有界长正文入口 |
| getPostRevisionContent(S,P,R,{max_bytes:12288,cursor},{signal}) :~783 | typed {data:{ref,post_kind,lifecycle,has_newer_revision,encoding:'json',chunk,start_byte,end_byte,complete},meta:{truncated,next_cursor}} |
| createPost(S,T,body,key,{signal}) :~763 | legacy data={post,revision,relations}；响应post.id用于选中，服务端author唯一，幂等scope post.create target=T |

getThreadPosts真实SQL为id ASC与id>after（sqlite-storage.ts740），不是created_at时间排序。ThreadPostsReadQuery limit1..100默认50，max_bytes4096..65536默认12288，实际整响应编码预算；cursor最长4096、TTL86400秒，绑定actor/space/thread/预算等服务规则，UI原样传递，不decode或另排序。无自动ACK。目录分页不等于永久快照。

正文续读固定同S/P/R：累积chunk按返回字节偏移并保持同ref，只有complete=true与meta.next_cursor=null时才JSON.parse整个字符串取得title/summary/body等，不逐段parse、不续页改为current revision。has_newer_revision显示文字提示但不自动替换已读版本。可能400无效/过期cursor、404无对象/无访问、410已脱敏、422预算不足；重开首段或显式提高预算，不能无限后台追页。PostRevisionReadQuery同4096..65536预算；数据带withdrawn/active状态，不等同正式评审通过。

```ts
const abort = new AbortController();
let csrf: string | undefined;
const client = new DetunedClient({baseUrl:location.origin,
  browserSession:{getCsrfToken:()=>csrf}});
const session = await client.createWebSession(token,{signal:abort.signal});
csrf=session.csrf_token; // 仅JS内存，不保存login token
const page=await client.getThreadPosts(spaceId,threadId,{limit:20,max_bytes:12288},{signal:abort.signal});
const first=await client.getPostRevisionContent(spaceId,postId,selectedRevision,{max_bytes:12288},{signal:abort.signal});
const next=first.meta.next_cursor===null?null:await client.getPostRevisionContent(spaceId,postId,selectedRevision,{max_bytes:12288,cursor:first.meta.next_cursor},{signal:abort.signal});
const result=await client.createPost(spaceId,threadId,{kind:'note',title:'标题',summary:'摘要',body:'纯文本'},operationKey,{signal:abort.signal});
```

note要求title1..160、summary1..280、body<=65536字节服务端复核，tags可选最多20/每项48；structured/refs/artifact_ids可选。**没有reply_to字段**，strict additionalProperties:false。refs条目为{target_ref:{post_id,revision},type}，type仅cites/supports/challenges/supersedes/reproduces/addresses；不能凭空添加reply_to/replies_to。本片可在当前主题新增note；若父要回复精确帖，应另外明确所用已存在关系语义，不伪造新字段。

WriteOptions={signal?,logicalOperationId?}；直接explicit requestKey传第4参数。浏览器没有Node文件store；操作首次提交生成/保存同一key于内存、未知结果用同body/key恢复，修改意图用新key；不能在每retry生成新key。原client bounded retry保持；身份/选择切换generation+abort并丢弃晚响应，logout不承诺回滚已提交。browserSession unsafe请求附当前CSRF，同源cookie；登录token仅本次Authorization，auth POST/DELETE singleattempt，查询恢复CSRF，失效401/403显示明确状态。

FR-10是项目概览/讨论/失败/搜索/修订/证据全Web目标（docs01:27），不能将最小首屏叫全部完成。docs02要求单实例API+Web静态与sharedclient；UI不读SQLite、不复制ACL。T11（docs09:21）要求恶意Markdown无脚本、私有不越权、长正文可读、键盘操作和文字状态。首片使用React纯text节点/pre，不dangerouslySetInnerHTML/自动Markdown HTML；标题、摘要、状态与完整固定版本纯文本支持此片，语义button/label、分页/加载/错误说明需实测。失败/搜索/证据页若未实现明确留后续，不称FR-10整体验收。

## 父确认的引用回复与长帖边界

“引用回复”用既有note/refs，不建回复树。准确body例：
```ts
await client.createPost(S,T,{kind:'note',title:'引用版本的回应',summary:'有限回应',body:'纯文本',
  refs:[{type:'cites',target_ref:{post_id:selectedPostId,revision:selectedRevision}}]},sameIntentKey,{signal});
```
PostRef只有post_id与revision（common.ts27），没有space_id；CreatePostRelationInput只有target_ref/type（posts.ts172）。服务端核同space/可访问修订与关系，不由UI猜。目录保持id ASC原顺序，标题不得称绝对时间顺序。

完整旧读取实际是`getPost(S,P,R)`→postService.getPost返回整个{post,revision}，**sharedclient没有名为getPostRevision的wrapper，也没有getPostContent**。此旧request默认`res.json()`，没有本地1MiB reader cap；1MiB限制只用于新增Web auth及artifact JSON方法，不能泛称所有sharedclient JSON有1MiB上限。新写body服务端65536字节，但历史内容/其它JSON字段可能更大，完整旧读取不保证响应大小，所以首屏不宜以它加载任意长旧正文。

`getPostRevisionContent`固定R，实际每个编码信封4096..65536预算（默认12288），cursor最长4096、TTL86400秒。可按用户明确“继续加载”逐页请求同R/预算，不后台无限预取；每页chunk可直接纯文本展示为标明的JSON片段（不是Markdown/HTML），完整且总量在父选UI内存预算内时才拼接JSON解析并呈现body。若超过本地预算，保留明确“内容未完整加载/固定修订/仍可继续”的分页查看入口，不假装已经完整或悄换current。具体UI总累计预算/分片显示方式由父冻结，不能以新帖子64KiB约束冒称任意legacy也有总上限。
