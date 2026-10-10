# M2.4-B.2.1 核心阶段1：只读路径与接口对齐

2026-10-06。已读AGENTS、README、docs00/08/11、progress及B.1 next-task唯一父冻结方案。起始B.1有限验收276/28/current29；三真历史夹具本轮not_run。仅本文件写入，未改产品/旧tests/规范，未运行before/tests/build/fullsuite。等待独验fresh baseline与父before信号。

## 现有字段与读取能力

`packages/core/src/ports/storage.ts:55/101/102` 已有同步 `readSnapshot<T>(fn:(snapshot:StoragePort)=>T):T`、`findPostById(id):Post|null`、`getPostRevision(postId,revision):PostRevision|null`。不需新增StoragePort/SQL/DDL/依赖。

`packages/protocol/src/posts.ts:144` PostRevision已具title/summary/body/tags/structured以及content_hash/editor_id/created_at。新投影只选父冻五字段，顺序固定；后三者不导出也不补hash。Post具space_id/kind/current_revision/lifecycle，足够生成post_kind、当前lifecycle及head>固定revision。structured当前类型有Record Unknown历史宽入口；新encoder不可调用parseNewTypedStructured或Value.Check新写schema，不能修剪额外字段。

`packages/storage-sqlite/src/sqlite-storage.ts:659` getPostRevision读取固定行，body等TEXT直取，tags/structured JSON.parse；内部findPostById当前redacted时返回墓碑投影。新服务必须先在同snapshot核current lifecycle并410，不能让该storage投影决定新接口错误。活跃/撤回材料不改写；body TEXT孤立surrogate按实际stored值，structured JSON孤立surrogate可保留，不声称逆转已丢字符。

`readSnapshot:65`复用当前连接交易，否则deferred transaction；同步callback拒thenable。不是SQLite强制只读模式，故服务只调用读端口，并用全库指纹证明无写。读取第一次身份/ACL已建立WAL快照，后续post metadata与固定revision同一snapshot；候选编码及签名时不得再读DB/current head。

## 唯一业务读取顺序与方法

候选类名 `PostRevisionReadService`，constructor(storage,signer,authService,secret,clock) 同B.1，无隐式环境/时间；必要core index导出。唯一方法：

```ts
getRevision(auth:AuthenticatedContext, spaceId:string, postId:string,
  revision:number, query:PostRevisionReadQuery,
  budget:{request_id:string}):PostRevisionContentPage
```

snapshot内部：refreshContext→requireSpaceAccess(observer/read)→findPostById目标同空间否则404→当前redacted则410 CONTENT_REDACTED→revision/query/budget严格结构及cursor绑定验证→getPostRevision固定行否则404→复制唯一五字段document与当前metadata/actor/maxBytes/start/exp。cursor非UTF8边界/末尾位置在一次JSON Buffer后判断，不读DB；redaction/current ACL仍先于坏cursor。

复用B.1精确算法而不抽泛化框架：一次O(doc) JSON/Buffer；remaining原bytes≤maxBytes才测完整末页；非末二分hi≤start+maxBytes且<total、调整UTF8边界，每候选包含完整metadata、真实req.id与签名cursor计量；不构造巨大尾chunk声称O(page)。complete与meta完整union，至少一码点推进，异常metadata/cursor过长或无推进422。当前lifecycle/head允许跨页变化但不进入固定五字段文档。

## 请求protocol共享导出（交父统一，不自行决定）

协议单元持有下列类型/纯函数，core不复制JSON schema：

```ts
type PostRevisionContentDocument = {
  title:string; summary:string; body:string; tags:string[];
  structured:StructuredContent;
};
type PostRevisionReadQuery = {max_bytes?:number;cursor?:string};
type PostRevisionReadCursorPayload = {
  v:1;purpose:'post_revision_read';actor_id:string;space_id:string;
  post_id:string;revision:number;byte_offset:number;exp:number;
};
// Page完整union，data字段和metadata严格沿父next-task，不另造第二DTO。
type PostRevisionContentPage = /* 父冻相关page union */;
encodePostRevisionContentDocument(document:PostRevisionContentDocument):string;
buildPostRevisionContentEnvelope(requestId:string,page:PostRevisionContentPage):PostRevisionContentEnvelope;
serializePostRevisionContentEnvelope(requestId:string,page:PostRevisionContentPage):string;
postRevisionContentEnvelopeBytes(requestId:string,page:PostRevisionContentPage):number;
validatePostRevisionReadQuery(query:PostRevisionReadQuery):void;
isPostRevisionReadCursorPayload(value:unknown):value is PostRevisionReadCursorPayload;
POST_REVISION_READ_LIMITS = {cursor_chars:4096,cursor_ttl_seconds:86400};
POST_REVISION_CURSOR_ERROR_MESSAGE:string;
```

ref可名PostRevisionContentRef（space_id/post_id/revision），schema及envelope类型由协议方生成；错误提示待父/协议统一精确字串。CONTEXT_BYTES/DetunedError/ErrorCode/现signer可复用。structured类型用现历史可读StructuredContent，不附新写严格范围；文档不会加入新默认字段。

## 调用兼容图与所有权

旧HTTP posts/:id→PostService.getPost、revision目录→storage.listPostRevisions、thread GET→Post元数据目录；旧client.getPost/forum_read post/CLI read原路不动。新route→新业务服务；新client.getPostRevisionContent/new forum_read post_revision/新CLI post read由协议接入单元负责。原PostService写入/新写validator与storage projection不改，因此本core单元无旧正式断言变化需求；新core业务test即可覆盖。若实现后真实类型/断言冲突，先逐项报父批准，不删旧语义。

独占候选：新service、core/index必要导出、新`tests/integration/m2-post-revision-read.test.ts`、docs03/docs12 ADR及本单元planning/implementation。此时只有本planning获准写；不提前补空包或新import。

## before与实施后有限验证候选

before由父先放行，至少两实质观测：旧getPost完整大body没有4KiB有界路径、真实新HTTP404及缺tool/CLI（接入方覆盖）。不得引用不存在service造成import失败。核心可在旧service真实SQLite成功读取大body后测原完整envelope>4K，保留旧材料可读与缺口，不声称新route已有。

实施后新业务测试覆盖父矩阵：stored Unicode/双转义/空body/历史structured原值；4K/64K/default/巨大req.id422；固定旧revision与head更新；withdrawn标识与has_newer；currentredaction410/身份撤销401/会员404优先；跨post/space/actor/revision/purpose/严格字段/非boundary与末尾；两非末页推进Clock、初exp沿用、换budget与等号/+1；全库无写；双WAL在getPostRevision屏障后第二连接改变lifecycle/head，证明当前metadata与材料同snapshot、下一请求看到新状态。不用sleep/模型/网络推理/10万负载。

暂未发现与父冻结方案的实质冲突。旧证据（含完整B.1）保留，fresh保护manifest由独验捕获，不复制2207旧数。下一步等待父统一共享名字及before/产品授权。
