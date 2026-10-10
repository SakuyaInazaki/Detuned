# M5.1-D 窄只读目录契约事实（未冻结接口）

本文件仅事实/候选，不实施或运行测试；M5-B产品与旧review保持。D.1两目录→D.2实际Web修订/附件旅程由父裁。

## 1. 可复用ThreadPosts边界的精确值

`protocol/request-policies.ts:2–4`：LIST_LIMIT=1..100/default20；THREAD_POST_LIMIT同范围/default50；CONTEXT_BYTES=4096..65536/default12288。`protocol/threads.ts:44–91`的strict query仅可选limit/max_bytes/cursor，cursor1..4096字符且含非空白；TTL86400秒。

Page是`{data:{thread,posts:Post[]},meta:{truncated,next_cursor}}`。严格Union：truncated=true需至少1post且非空cursor；false+cursor也需至少1post；false+null可0post。thread目录metadata复用Thread字段但title只String（不强加新写160上限）。完整wire envelope加`api_version:'1',request_id`，用JSON.stringify再TextEncoder量UTF-8；不是只计算data或条数。无名为complete的字段，`next_cursor:null`表示当前动态目录没有下一页，不冻结跨页全集。

`ThreadPostsReadService:24–80`单页同步readSnapshot先refreshContext+observer、验证thread属于URL空间，最多limit+1候选（实际返回<=100），storage按id ASC。签名payload=`{v:1,purpose:'thread_posts_read',actor_id,space_id,thread_id,sort:'id_asc',after_id,exp}`；verify用实例secret与当前Clock秒，校验actor/space/thread/类型/expiry，续页保持原exp。不把新目录放进这个purpose或共用对象域。

它对完整envelope及cursor长度裁尾，只以最后实际输出item续页。因预算删除才truncated=true；仅数量有更多而未裁尾为false+cursor；至少1item+必需metadata仍装不下422 QUERY_TOO_BROAD（提示增max_bytes）。游标坏/过期/域不符400 VALIDATION_ERROR、不含原cursor；query形状同400。缺对象/跨space404，当前权限检查仍原AuthService错误。签名算法由现TokenSignerPort实现，不新增跨页snapshot或事件流。

## 2. 修订metadata真实字段

`protocol/posts.ts:144–157`完整PostRevision中可窄取：`revision`整数>=1；`editor_id`String；`created_at`String/date-time；`content_hash`String长64（当前schema没有hex pattern）。`post_id`String可作为目录固定定位信息，放header或每row待父定。不要为了目录读取title/summary/body/tags/structured，更不能返回session_id。现post的`current_revision`/lifecycle可作目录外层当前状态事实，具体DTO不在此冻结。

SQLite复合PK(post_id,revision)支持revision DESC与`revision < after`，窄SELECT无需DDL。现旧接口必须留完整row；新query/DTO独立，不修改旧十进制cursor语义。父暂定redacted post同固定reader410，避免新SELECT泄旧content_hash（物理脱敏未擦hash，而旧storage投影掩码）。

## 3. 附件metadata、missing与purpose

`protocol/artifacts.ts:41–46`公开ArtifactMetadata准确字段：id/space_id/owner_id/mime/content_url均String；visibility固定space；sha256 String长64（无hex pattern）；bytes整数0..26214400；state ready|redacted|missing；created_at date-time。它没有storage_key或review_assignment/check_run私有绑定；现GET metadata实际只ready+存在文件成功，redacted410、missing404，不能说已提供missing详情。

`logical-import.ts:58`将来源ready manifest转missing，保owner/hash/bytes/mime/time而不搬bytes；来源missing/redacted墓碑用synthetic owner/64零hash/0bytes/octet-stream/importTime，新随机storage_key无文件。其来源export count允许safeinteger，故合法missing预期bytes可能>25MiB；未来状态目录不能盲套上传/现ArtifactMetadata的25MiB限制或把合成零字段伪称真实来源。物理restore保原DB状态。另有文件丢失但DB仍ready：新目录若只读DB不得宣称已验下载；现下载仍自行FS/完整性检查。

`revision_artifacts`（schema.sql:155–161）的purpose是TEXT NOT NULL DEFAULT evidence，无CHECK；正常`artifact-references.ts:29`写固定evidence，但export/import接受Type.String原样（export.ts:27、logical-import.ts:57），可能合法空/自定义历史值。枚举仅evidence会改历史兼容，是否投影/保留与字段预算由父裁。

父暂定：post redacted410；artifact redacted只id/state墓碑，绝不回原hash/bytes/mime；missing显示缺失并可保公开预期材料metadata（不是下载已验）；非本space/非public关联完全不披露。关联表无post+revision FK，读取先确证精确post/revision存在，JOIN过滤，不能裸dump关联ID/purpose或数量。

## 4. 路由与最小文件候选

现posts routes为`/spaces/:space_id/posts/:id`、`.../revisions`、`.../revisions/:revision`（server/routes/posts.ts:47/62/75），组合根统一/api/v1。候选`.../revisions/catalog`是静态段，对现`:revision`的有效数字访问不冲突；此前catalog只会走非法整数400，因此新增是明确新语义。候选`.../revisions/:revision/artifacts`多一段，无现同名route。参数命名仍需沿实际space_id/id，不悄悄全局重命名；最终wire/OpenAPI路径由父选。

两目录可共用一个小core catalog service的private“refresh+observer+post空间/lifecycle”检查；附件分支额外精确revision存在性。每方法只在现同步readSnapshot内查DB与投影，不调用async getMetadata/FS、不主写连接跨await，不造通用目录框架。共享的是auth与预算逻辑，不混用cursor purpose/object域。

候选最小所有权：core/ports/storage.ts、storage-sqlite/sqlite-storage.ts；core新窄catalog service及index；protocol相邻posts/artifacts（必要独立catalog模块）、index/http-policy/openapi；server/posts routes及app组合；client薄wrapper/type export；新正式core/HTTP/client tests。D.2才动Web，不需SQL/schema文件、迁移/新依赖。最终路由/字段/数量默认/预算/cursor/state DTO均待父一次冻结。
