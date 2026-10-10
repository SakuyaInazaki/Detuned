# M5.1-D 两个只读目录缺口（事实，未实施）

仅核这两个缺口；未运行测试、修改产品/DDL或旧review。M5.1-C仍只用已有API，不被未来目录阻断。路由、schema、字段、限额与脱敏表现由父后续冻结。

## 当前修订列表

- `core/src/ports/storage.ts:115–116`只有getPostRevision与返回完整PostRevision[]的listPostRevisions；没有metadata分页port。`sqlite-storage.ts:702–736`以post_id/revision DESC、`revision < cursor`、limit+1分页，SELECT *后构造title/summary/body/tags/structured/hash/editor/time。body不是SQLite分页的必需字段，而是当前返回类型/旧wire契约必需；不能只在Web删body假称服务端有界。
- `protocol/src/posts.ts:144–157`PostRevisionSchema要求正文与structured等；`server/routes/posts.ts:75–100`旧HTTP仅limit/cursor、返回data完整rows与meta，无编码byte预算。它检查空间observer和post.space_id，不签名旧十进制revision游标。现行行为应保留供旧client/CLI。
- `schema.sql:101–113`复合主键(post_id,revision)足以支持窄SELECT字段/keyset，无需新增表、索引或迁移。可另添metadata查询，不读取body/structured/tag大字段；若父要title/summary必须明确对历史大字段的读取/byte预算处理，不能仅用item limit宣称bounded。

## 固定revision附件关联

- `schema.sql:155–161`revision_artifacts字段post_id/revision/artifact_id/purpose，PK三列；artifact_id有FK，post_id/revision没有复合FK。现port `storage.ts:141`仅createRevisionArtifact，`sqlite-storage.ts:974–976`仅INSERT，没有关联list/read service/HTTP/client。
- `core/services/artifact-references.ts:4–30`写时要求artifact_ids互异，artifact类型evidence_refs须同时列入artifact_ids，登记附件同space、visibility=space、ready；post create/revise事务调用linkRevisionArtifacts，purpose固定evidence（post-service.ts:124、280）。刚上传的artifact只有创建metadata，不会自动成为帖子关联，必须真实写帖绑定；只查关联表可以找上传后已绑定的对象，不能找未绑定上传或宣称全实例附件目录。
- `artifacts`本身有space/visibility/state/hash/bytes/mime/storage_key与私有绑定字段（schema.sql:140–153）；新公开投影不能SQL spread或暴露storage_key/review_assignment/check_run。关联查询可用复合PK前缀(post_id,revision)并artifact_id keyset，JOIN artifacts过滤同space/public；仍须先确证post与精确revision存在，不依赖缺失的FK或从非法跨space关联泄露ID/数量。
- 当前`ArtifactService.authorizeRead/getMetadata`（22–35）刷新凭据/observer、同space/public；redacted410、非ready404，随后exists才返回公开ArtifactMetadata。不能直接逐项getMetadata冒充同步有界目录：它涉及FS await且拒绝missing/redacted，无法给状态墓碑。
- `PostRevisionReadService:26–51`短readSnapshot先refresh+observer、post空间/生命周期、精确revision检查；post红acted410。旧storage列表会对所有历史内容投影[REDACTED]/空结构/hash='redacted'（681–736）；物理redaction只改内容字段而非原content_hash（1404–1413）。新窄SQL必须按当前lifecycle投影，不能返回残余原hash。
- artifact脱敏只更新state（sqlite-storage.ts:1464），原hash/bytes/mime及关联仍在。目录应父裁“过滤”还是最小id/state墓碑，绝不能无条件导出原hash/size/mime。missing也需明确状态语义；ready登记不等于物理文件存在，下载沿原鉴权/FS检查，不称新列表已验证bytes。
- 已有export固定同space/public关联并略去redacted post关联（space-export-snapshot.ts:16、space-export-service.ts:124–132），是可读安全先例，不是可复用HTTP列表；其特殊导出墓碑语义不可悄悄当新metadata契约。

## 最小落点候选与父裁项

1. 新修订metadata目录：StoragePort窄方法→SQLite仅metadata SELECT→core专用同步read服务→posts route薄接→protocol专用DTO/query/cursor/envelope→sharedclient新薄wrapper；旧完整revision端点保持。无需DDL，新增的是读SQL而不是迁移。
2. 新精确revision附件目录：port关联keyset JOIN→core同一当前auth/post/revision保护与public投影→薄HTTP/protocol/client；不下载bytes、不任意抓content_url、不新写关联。无需新表/索引，不能用现无界listArtifactStorageKeys代替。
3. `ThreadPostsReadService:24–80`/`protocol/threads.ts:44–91`可复用设计：每请求同步readSnapshot+refresh、签名actor/space/object/purpose/sort/expiry游标、最多有界候选、按实际request_id计算完整UTF-8 envelope（含cursor）后裁尾，用最后实际输出项续页；至少一项仍装不下422。snapshot只单页一致、不跨页固定全集，主连接不得跨await。固定正文服务已有UTF-8切片，不适合作metadata目录底层，因为它每请求读/编码完整文档。
4. 父需冻结：两入口名称/metadata白名单、数量与encoded-byte限额、cursor绑定精确revision与当前可见性、post红acted410或墓碑、artifact redacted/missing公开最小状态、超大首项/空页语义与动态跨页新增说明。不能把普通写ready校验复用成历史目录过滤规则；M5-C无需等待这些决定。
