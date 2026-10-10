# M2.4-B.2.2 父统一接口冻结

2026-10-06。fresh baseline：126 source、35 docs、5 mutable、2492旧证据。行为以B.2.1 next-task及本包core.md为唯一依据，导出采用core.md完整列表，contracts.md不再开放候选。

ThreadPostsReadService.getPosts(auth,spaceId,threadId,query,{request_id}):ThreadPostsPage。ThreadPostsReadQuery/CursorPayload/Page/Envelope及对应Schema；buildThreadPostsEnvelope、serializeThreadPostsEnvelope、threadPostsEnvelopeBytes、validateThreadPostsReadQuery、isThreadPostsReadCursorPayload、THREAD_POSTS_READ_LIMITS（cursor_chars4096/cursor_ttl_seconds86400）按core.md签名。limit复用THREAD_POST_LIMIT，budget复用CONTEXT_BYTES。

THREAD_POSTS_CURSOR_ERROR_MESSAGE固定为`Invalid or expired thread posts cursor. Remove cursor and retry the first page.`。page三分支：truncated true必须至少一post及非空cursor；false+非空cursor也至少一post；false+null允许空。metadata schema只读，不带新写限制或正文引用。Thread及Post现metadata字段原样，完整compact envelope计实际req.id。

新GET与原POST合并同path，新forum_read thread_posts仍8工具，新getThreadPosts及CLI thread posts返回整page；旧HTTP/client裸cursor分页及旧tool/CLI默认首批data保持。没有获准改旧formal。当前仅before证据获准，产品/正式tests/build仍待父统一放行。

## 2026-10-06 实施放行阶段更新

父已读两单元before并统一放行本轮产品实施；上述before-only为初始时点记录。共享导出/错误文字/三分支不变，旧formal无修改授权。接入已实施，新专项与源码静态检查进行中，验收仍待最终freeze及独验，不build。
