# M7.1-B1 HTTP + shared client task候选

status: root_fixed_scope_pending_current_gate_seal_fresh_dispatch

只planning，不实施/运行。当前M7.1-A gate失败优先。B1只HTTP+sharedclient；CLI/MCP/tools/adapter等B2，Web/browser继续保护；无新表/port/allattempt目录。A core/protocol/server+HTTP作者test，B client/transfer+contract作者test，D独验与唯一串行gate。候选existing/missing不等于写入授权。

依据 [transport facts](m7-1b-transport-facts.md)、[public-shape facts](m7-1b1-public-shapes.md)及root固定裁定；不能把事实候选当已经实现API。

## 十二入口

S=/spaces/:space_id，R=S/check-runs/:run_id，均现/api/v1下：

1 POST S/check-runs
2 GET R
3 GET R/snapshot
4 GET R/posts/:post_id/revisions/:revision
5 POST R/credentials
6 POST R/receipt
7 GET R/receipt
8 POST R/invalidate
9 POST R/artifacts
10 GET R/artifacts/:artifact_id
11 GET R/artifacts/:artifact_id/content
12 GET S/review-requests/:request_id/check-runs

domain权限、状态、幂等事务继续core；route只canonical输入/参数/query校验、业务调用、白名单响应投影。credentials不收Idempotency-Key，client supplied key零HTTP拒，retryBudget0；body严格ttl_seconds?60..86400/default3600，once返回credential_id/token/expires_at。其它写沿已有键和事务。无checks公开CLI/tool本包。

## Canonical公开DTO与绑定

CheckRunView沿真实record白名单除created_request_version，加authorized space_id；不给run history/observed/binding/token。字段id/request_id/snapshot_id/snapshot_sha256/check_name/attempt/verifier_actor_id/check_config_sha256/state/version/created_by/created_at/changed_by/changed_at/invalidation_reason/space_id。

ReceiptView=SubmitCheckReceipt全部canonical原字段+check_run_id/verifier_actor_id/received_at/run_version/authorized space_id，不扩内部存储信息。严格unknown/码点/map/JSON65536/hash/ISO/passexit/input限制仍现canonical共享；response wholeDTO与目标space/run/hash绑定。

CheckSnapshotView复用ReviewSnapshotView字段加check_run_id；现domain getSnapshot返回底层records，route必须显式投影record+manifest。CheckPostRevisionView复用PostRevision字段加space_id/check_run_id；targeted guard绑定请求space/run/post/revision及内部schema/hash一致性，不伪称普通postreader chunk协议。

Scoped artifact metadata仍普通ArtifactMetadata形状，无check_run_id“来源”字段；仅HTTP projection替换content_url为精确编码R/artifacts/:id/content，专用guard绑定space/run/id与完整URL。domain toArtifactMetadata/幂等历史equal不得改；genericartifact permission不放宽。固定snapshot公共附件也通过同scoped入口读，无sealed/evidence外材料。

目录DTO={space_id,request_id,snapshot_id,request_version,verification_status,checks:[{check_name,run:CheckRunView|null,receipt_id:string|null}]}。新增core普通读entry，一个readSnapshot先刷新普通ACL/固定材料privacy再readRequiredCheckFacts；verify在发现request前拒。冻结required顺序、唯一name、≤32、缺run=null、空集合原not_required；不输出receipt正文/私有初评、不换当前policy、不加storageport或allattempt分页。guard严格空项/顺序/scope/唯一/metadata与每run交叉绑定。

## Shared client与流

new typed方法调用十二入口；无隐式getMe/普通session。verify receipt/log支持explicit key或每调用auto-key；TypeScript不给logicalOperationId，runtime若有该字段，必须任何file snapshot/HTTP/getMe前拒。issuer无自动retry，client key零HTTP拒。普通客户端/旧method行为保持。

复用requestWithBody bounded JSON错误/取消，artifact-transfer既有25MiB bounded stream、declared bytes/MIME、EOF/SHA256、redirect拒绝、取消/late dispose；必要新增scoped hooks参数，不能新宽松通道或按不可信URL任意抓取。scoped URL只root选定同origin精确path。

Server复用现artifactRoutes multipart元数据/文件限额/stage/hash/publish/中断cleanup+core提交前复核，shared upload/read handler可最小提取为scoped目标。canonical body/params/query/response一致，OpenAPI最终构造不可被末尾Object.assign覆盖。签发明文响应no-store、不日志泄漏token。

## 验收

真实HTTP/共享client+SQLite/bounded bytes：普通/verify权限矩阵、sealed隔离、wrong space/run/post/revision/hash/body/unknown字段；samekey网络错误重放、terminal合法历史replay/currentredaction、rotation/expiry；一次签发retry0/key零HTTP；logicalOperationId零file/HTTP/getMe；目录完整冻结顺序/null/wholearray拒绝；scopedURL特殊编码IDs与genericartifact仍拒verify；stream限额/EOF/hash/MIME/cancel/late response资源处置。作者HTTP与client受控transport契约分层，D独验；不能将controlled反例称外部宿主认证。不得生成占位接口或宣称未运行通过。

## 精确接点与一个需root裁的技术缺口

- core/check-service.ts仅新增普通required目录entry，公式仍readRequiredCheckFacts。
- protocol/review.ts、response-guards.ts、openapi.ts负责新DTO/targetedguards/实际spec；server/app.ts注册CheckService与新checks plugin。
- routes/artifacts.ts当前bounded上传handler是plugin内部闭包且含multipart注册；需要其owned窄提取/复用而非在新checks route复制较弱版本。
- client/client.ts及artifact-transfer.ts为typedcall/key/targetedguard/scoped完整性hooks；index已有exports，不必为候选仪式扩owner。
- **snapshot actual SHA验证 portable canonical接点缺口：**现ReviewSnapshotView guard只schema/date；RFC8785+预算的canonicalizeReviewJson在modules/review/src/canonical-json.ts（纯模块，非protocol）。client不能引入core Node crypto或新增module依赖；现artifact-transfer有WebCrypto SHA256但canonical仍缺共享portable入口。若root“hash一致性”要求客户端重算manifest SHA（而非只字段hash交叉绑定），建议root批准迁移纯canonical helper到protocol新review-canonical.ts，module原文件reexport保持旧调用/测试，protocol/review.ts reexport供client；最小额外existing module canonical+new protocol helper，当前owner候选未擅加。root需裁，不复制公式/不降要求。
