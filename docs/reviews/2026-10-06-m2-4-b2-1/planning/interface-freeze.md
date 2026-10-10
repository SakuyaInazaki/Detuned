# M2.4-B.2.1 父代理接口冻结

2026-10-06。父已确认planning/core.md与B.1 next-task的唯一合同；此文件是批准接口，不是实现/验收结论。旧B.1冻结文件原字节保留。

- 新GET `/spaces/:space_id/posts/:id/revisions/:revision`；严格必需正safeinteger path revision。query仅max_bytes/cursor，预算复用CONTEXT_BYTES 4096..65536/default12288。旧GET posts/:id、修订目录/旧getter、forum_read post与CLI read合法输出不改。
- `PostRevisionContentDocument = Pick<PostRevision, 'title'|'summary'|'body'|'tags'|'structured'>`，保现StructuredContent历史宽类型，不套新写validator/默认/trim/删历史额外键；encode固定JSON.stringify({title,summary,body,tags,structured})顺序，唯一stored投影，不称content_hash是该投影hash。
- 导出PostRevisionContentRef `{space_id,post_id,revision}`；PostRevisionContentPage/Envelope data唯一字段ref、post_kind、lifecycle(active/withdrawn)、has_newer_revision、encoding:'json'、chunk、start_byte、end_byte、complete。complete=false→truncatedtrue/nonemptycursor，true→false/null；完整page/envelope相关union。固定文档与当页current metadata/ref同snapshot；metadata可随页变化、不属于拼接文档。
- 导出PostRevisionReadQuery `{max_bytes?,cursor?}`；PostRevisionReadCursorPayload strict v1/purpose post_revision_read/actor_id/space_id/post_id/revision/byte_offset/exp，additionalPropertiesfalse，正safeint修订与offset、非负safeint exp；最长4096chars、首次24h、续页沿首exp、不绑定预算、等号有效/+1秒失效，拒未来exp>now+24h。
- `POST_REVISION_READ_LIMITS={cursor_chars:4096,cursor_ttl_seconds:86400}`；`POST_REVISION_CURSOR_ERROR_MESSAGE='Invalid or expired post revision cursor. Remove cursor and retry the same fixed revision.'`。
- 纯helper：encodePostRevisionContentDocument(document):string；buildPostRevisionContentEnvelope(requestId,page):PostRevisionContentEnvelope；serializePostRevisionContentEnvelope(requestId,page):string；postRevisionContentEnvelopeBytes(requestId,page):number；validatePostRevisionReadQuery(query):void；isPostRevisionReadCursorPayload(unknown):typeguard。相应类型/schema由protocol/posts提供，index现posts导出复用。
- core `PostRevisionReadService.getRevision(auth,spaceId,postId,revision,query,budget:{request_id}):PostRevisionContentPage`。每页refresh/current space read→目标空间/生命周期先验→cursor，redacted410、withdrawn可读、跨空间/无权404沿既有策略。业务权限/修订/游标只在core。无新DDL/依赖/泛化框架、写validator/旧SQLite空间/帖子写行为不改。
- UTF8完整码点边界；actual req.id/双层JSON/实际签名cursor完整envelope同serializer计量，route只send，不裁业务。先测可fit完整尾页、非末二分上界<=start+max_bytes且<total；必须非空推进，否则422。每请求O(doc)，不称CPU/常数内存cap。
- 新client `getPostRevisionContent(spaceId,postId,revision,query?,opts?:{signal?}):Promise<PostRevisionContentPage>`；共享HTTP与Signal，不增加运行时response validator。forum_read加strictrootobject+anyOf post_revision分支(space_id/id/revision必需，max_bytes/cursor可选)，新kind整page、旧post整data；原8tool名字不改。
- CLI `detuned post read <space-id> <post-id> --revision N [--max-bytes N] [--cursor TOKEN]`，严格数值、完整page，原read/search/space/context合法输出保持。docs04旧规划行待实施同步，新examples/post-revision-read.md。
- core单元持service/index/new integration/docs03/ADR；协议单元持相关protocol、server app/posts route、client/CLI、新contract/docs04/example；独验持新增verification证据。当前未发现需改旧正式断言，任何必要旧适配逐项先报父。现已四实质before，产品写仍等父统一信号；不覆盖旧证据、不build/fullsuite、commit/push/清理/模型/global。
