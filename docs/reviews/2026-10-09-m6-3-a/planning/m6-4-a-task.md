# M6.4-A：HTTP与共享客户端完整评审纵向

状态：root已批准下列路由、成功码、DTO/list形状与所有权；待本包M6.3-A功能/metadata接受、整封、新fresh与实施放行；未实现、未验。M6.4-B才CLI/MCP/Pi，M6.4-C才Web、可信状态与检索投影。本包无新DDL/index、外部依赖、模型或环境，禁止VM/Colima/守护程序/全局配置。

## 既有真实业务入口与候选路由

下表全部位于 `/api/v1/spaces/:space_id`，S是当前URL空间。所有业务资格/隐私/固定绑定在module/core；route仅严格解析、转auth/参数/key、封装现success。POST key只Idempotency-Key header，不放body。未知/重复query及非法body拒绝，正safeinteger版本与ID路径encode复用现边界。

| HTTP冻结 | 实际service签名 | data与成功码 |
|---|---|---|
| POST /review-requests | ReviewRequestService.createRequest(auth,S,CreateReviewRequest,key) | 原ReviewRequestView，201 |
| GET /review-requests/:id | getRequest(auth,S,id) | ReviewRequestReadView，200 |
| GET /review-snapshots/:snapshot_id | getSnapshot(auth,S,snapshot_id) | 现snapshot_id/space_id/manifest_sha256/manifest/created_by/created_at，200 |
| GET /review-requests/:id/assignment | ReviewSubmissionService.getOwnAssignment(auth,S,id) | id/request_id/reviewer_actor_id/snapshot_id/snapshot_sha256，200 |
| POST /review-requests/:id/submissions | submit(auth,S,id,CreateReviewSubmission,key) | 原ReviewSubmissionAcknowledgement，201 |
| GET /review-submissions/:submission_id | getSubmission(auth,S,submission_id) | 现平面ReviewSubmissionView，200 |
| GET /review-requests/:id/submissions | 新listVisibleSubmissions(auth,S,id) | 严格{request_id,submissions:[ReviewSubmissionView]}，≤5，200 |
| POST /review-requests/:id/finalize | ReviewFinalizationService.finalizeRequest(auth,S,id,FinalizeReviewRequest,key) | immutable ReviewDecisionView，200 |
| POST /review-requests/:id/cancel | cancelRequest(auth,S,id,CancelReviewRequest,key) | 原固定版本ReviewRequestView，200 |
| GET /review-requests/:id/status | ReviewStatusService.getStatus(auth,S,id) | ReviewStatusView六字段，200 |
| GET /review-requests/:id/decision | getDecision(auth,S,id) | immutable ReviewDecisionView，200 |
| POST /review-requests/:id/artifacts | 服务先求当前actor本人assignment；ArtifactService.createForReview(auth,S,assignmentId,{staged,mime,metadata},key) | strict ReviewArtifactMetadata，201 |

flat snapshot/submission GET避免URL多一层request_id却没有服务绑定的漏洞；若root选择nested地址，必须加module实际绑定接口，不在route复制。当前没有全space request列表；request ID/公共metadata事件可发现，post目录待Web实际需要另定。

## 必要业务/协议差分

- 新visible-list在**一个readSnapshot**先refresh current space observer/read、request存在/sameSpace及snapshot隐私；稳定按固定roster序，只纳本人行或row.revealed_at非null，不用phase判公开（cancelled仍可能有真实revealed，stale也不公开sealed）。其他sealed含admin无IDs/意见/健康泄漏；不返回全名单提交者映射或私有total。每个可见行沿现getSubmission严格intrinsic与当前evidence privacy，红删410/隐藏404不放松。返回max5，未交本人空数组，不发ACK/事件。
- protocol增加SnapshotView、OwnAssignmentView、VisibleSubmissionsView的TypeBox+Static及严格success schemas，复用现RequestRead/SubmissionAck/SubmissionView/Decision/Status；code/limits/meaning不另抄。targeted response guards复用现browser-safe Value+锁定full日期格式校验组件，不引Node/MCP SDK或globalRegistry。检查ID/空间/父request绑定与严格unknownfields、safeint/hash/date；原写确认与旧replay deepEqual保持。
- Fresh create依旧policy.enabled=false→现400；旧历史读/replay不按后来policy重解释。finalize/status以request冻结manifest的policy/required_checks，currentpolicy变化独立stale。请求cookie/Bearer沿既有同源/CSRF/混身份安全层，无anonymous review入口。
- server组合root真实构造ReviewModule(storage,hasher,clock,idGen,authService)、RequestService(storage,auth,idem,clock,idGen,builder)、SubmissionService/FinalizationService(storage,auth,idem,clock,idGen)、StatusService(storage,auth)。modules_enabled如实加review，无新全局开关；server声明@detuned/module-review workspace依赖，client/CLI不依赖module。
- private multipart只能file与严格metadata（metadata只空对象或省略；不接visibility/review_assignment_id/owner/actor）。assignment仅服务由当前actor/request求得，route不接任意assignment或scope。复用现multipart文件25MiB/metadata4096/activeupload限额、AbortController/runtimeResources、stage ownership/discard/publish失败清理、core两阶段授权与最终write-tx fresh复核；不能另写私有上传业务引擎。原公共upload DTO/mapper literalspace不变，GET/download已readable union。

## 客户端与持久key

B仅在DetunedClient现executor/write/BodyFactory上加薄wrapper，不复制资格/状态。所有JSON成功使用严格guards与既有1MiB bounded response、timeout/AbortSignal/公共error解析；不泛称旧全部JSON已有此限。GET无key；create/cancel/submit/finalize/privateupload用现typed持久key与服务器幂等安全retry，取消/身份变动/explicitkey优先规则保持。冻结local families review.request.create(target null)、review.request.cancel/review.request.finalize/review.submission.create(target requestID)、artifact.review.create(target requestID)均space required；私有server operation仍绑定本人assignmentID，不能用body混身份。store v1不变，不存body/token/file bytes。

私有上传wrapper uploadReviewArtifact(S,requestId,file,metadata={},key?,WriteOptions?)，每attempt新FormData保不可变Blob/key；不默认落file。复用现固定路径downloadArtifact与完整SHA/bytes验证，不信任content_url做任意URL请求。wrapper冻结为 createReviewRequest/getReviewRequest/getReviewSnapshot/getOwnReviewAssignment/submitReview/getReviewSubmission/listReviewSubmissions/finalizeReviewRequest/cancelReviewRequest/getReviewStatus/getReviewDecision/uploadReviewArtifact，参数沿现client约定。

## 精确所有权与最小链接

A：protocol/src/review.ts、response-guards.ts、openapi.ts及必要index薄export；modules/review/src/submission-service.ts（visible-list）、必要index；server/src/app.ts、routes/meta.ts、新routes/reviews.ts、routes/artifacts.ts（仅复用管线路由接线）、packages/server/package.json；新tests/contracts/m6-review-http.test.ts。core/src/services/artifact-service.ts 仅新增下述窄upload admission并必要抽同一授权helper，不扩业务。
B：client/src/client.ts、request-key.ts及仅必要artifact-transfer.ts guard接线；新tests/contracts/m6-review-client.test.ts；pnpm-lock.yaml仅server新增内部workspace linker项（A改server manifest后B记录）。不改外部pins、packageManager、SQL/schema或业务module。
D：独立真实HTTP/SQLite/API与client/private bytes probe；旧写确认/旧4/5维护兼容；唯一串行build/type/lint/core/current组合执行窗与before/资源保护。A/B不运行checks，不与D共写。

fresh后由root单独准最小本地offline workspace链接：沿现已获准cache/空npmuser/globalconfig、frozen/offline/ignore-scripts/ignore-pnpmfile，无网络/force/全量重建/新安装脚本。先确认server importer新增workspace项及模块现已link情况，再决定实际argv；不能现在执行。编译按workspace有向依赖module-review→server，无core反向module/JCS。

## root冻结的窄上传准入与缓存事实

A新增 ArtifactService.authorizeReviewUploadForRequest(auth,spaceId,requestId):string，返回当前actor真实本人assignmentID。在同一readSnapshot刷新credential、observer+write后查本人assignment，复用现private false授权与完整privacy；不调用fresh资格/phase检查。route只使用返回ID，不接受scope/assignment或skipprivacy。createForReview新action最终事务仍核fresh资格、phase与材料，两阶段publish/finally保持。

新三个strict read DTO/list及上表flat路由已批准。所有新review routes一律Cache-Control:private,no-store，含成功与错误响应。现artifact content下载 routes/artifacts.ts:143已有private,no-store；metadata GET该文件110–117未设缓存头，app.ts:155仅Webcookie/auth路径设置no-store，root已裁A在同routes/artifacts.ts窄修metadata GET：返回visibility为review_assignment时设置Cache-Control:private,no-store，公开space metadata行为保持；content既有保持。下包增加真实HTTP成功/错误review缓存头、私有metadata缓存头及公开metadata不改变的断言，当前仍不实施。

## 验收与保护

真实HTTP普通requester/reviewers/reader/admin：所有routes/schema/headers、error precedence、policyfalse/ACL撤销、sealed本人或revealed名单/取消后公开仍可见、badURL跨space和ID绑定、strictguard/1MiB/timeout/cancel、现exact write replay、finalize/持续stale/status。真实multipart私有上传/下载SHA、owner assignment不可伪造/无unused泄漏/中途撤权与stale无副作用，server关闭drain保持。最后HTTP公开不得扩成M6.4-C公共检索投影；不把inject或typedclient替身称真实浏览器。

首失败/最小修后受影响复验保；本包不为未来sealed/私有数据生成公开fixture，不输出真实token/manifest秘密。作者源码freeze后D执行，根验收后metadata；M6.4-B宿主/CLI、M6.4-C Web与检索投影及M7检查/回执/完整演示仍必要。
