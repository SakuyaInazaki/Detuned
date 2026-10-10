# M6.4 接入入口事实（2026-10-09）

现状与缺口，非新路线；无实现/测试/浏览器或安装。M6.3-A当前源仍待D验收，以下内部服务存在不代表公开可用。

- HTTP：packages/server/src/app.ts:114–139创建core空间/帖子/关系/事件/上下文/目录/附件服务；没有ReviewModule/Request/Submission/Finalization/Status实例或review开关。现routes目录只有admin/artifacts/auth/events/export/meta/operations/posts/relations/search/spaces/threads，无review路由。routes/meta.ts:14 modules_enabled为core/fts5/sqlite-wal及可选artifacts，不含review。OpenAPI review动作尚无公开path。
- 内部服务：modules/review/src/request-service.ts createRequest/getRequest/getSnapshot/cancelRequest；submission-service.ts getOwnAssignment/submit/getSubmission；本包finalization-service.ts finalizeRequest/getDecision，status-service.ts getStatus。缺的是传输组合/公开契约与注册，不是把snapshot和sealed payload丢到通用post读链。private upload内部ArtifactService.createForReview与既有metadata/download授权已存在，尚无assignment上传HTTP入口。
- 协议：protocol/src/tools.ts:195–238 inactive Review union已有request/submit/finalize/cancel四op；都space_id+request_key；request复用CreateReviewRequest DTO，submit带request_id并复用CreateReviewSubmission，finalize带request_id+required expected_version，cancel带request_id+expected_version/reason。严格additionalProperties=false。该union未加入DETUNED_TOOLS八个广告。未预留assignment/submission/status/decision/snapshot read动作；forum_read校验/说明明确artifact/review不支持（:43/:253）。
- Sharedclient：packages/client/src/client.ts没有review薄wrapper；callTool注释:959虽列forum_review，但实际switch无case，落Unknown tool。既有GET/POST/unsafe cookie-CSRF、signal/timeout/boundedretry/RequestKeyStore可复用，review具体op key family尚未client持久登记。requestWithBody(...undefined,true)有界1MiB JSON可以给新response guard用；getPostRevisionCatalog:792起验证完整page和requested post/ref一致，不能以仅TSgeneric冒schema验证。分页cursor现为接口自己的opaque域，新review列表是否需要/限额须root定，现内部没有request列表port。
- MCP：packages/mcp/src/tool-validation.ts以DETUNED_TOOLS构建SDK全schema validator，getMcpTools flat/wrapped从唯一canonical派生；bridge调用sharedcallTool和现身份/session协调。新增工具/读kind需实际shareddispatcher和安全错误/结构结果接线，不能只加广告。
- Pi：adapter-pi/src/index.ts:26–36同DETUNED_TOOLS注册，runtime.tool委派共享client，保代取消/诊断session/安全错误；只有/forum-status、/forum-check命令，无review额外命令。本包无需复制server评审判定。
- CLI：cli/src/index.ts没有review command/group；旧输入安全object/read与幂等flags可复用，但确认/read/output、private upload文件IO与精确schema须root冻结，不能用普通artifact upload伪scope。
- Web：web/src/app.tsx:506/565显示“正式评审尚未启用”。现纯text/安全Markdown、固定ref/分段reader、证据目录/上传、generation/logout已有；无review工作台、名单/提交/揭示/decision/currentstatus UI。现space-overview可展示policy事实不代表正式审核结果。

root需决定：最小纵向公开动作包/准确routes+DTO成功envelope、安全分页/预算、是否先read或create-submit-finalize、public检索/可信状态投影时机、inactive tool何时真正启用及flat/wrapped兼容。必须保sealed404/公共event过滤/旧确认immutable/currentACL隐私优先，不把M6.3内部服务直接当全M6可用。M7真实checks仍未实现，任何入口不得把pending写成passed。

## Workspace dependency and enablement supplement
- Actual review package name is `@detuned/module-review` (`modules/review/package.json`), not `@detuned/review`. Server/client/CLI package.json do not declare either name. Metadata-only checks found no `node_modules/@detuned/module-review` or `@detuned/review` symlink in those three packages. No installation performed.
- Public ReviewPolicySchema `packages/protocol/src/spaces.ts:16` defaults enabled=true; actual SpaceService DEFAULT_REVIEW_POLICY `packages/core/src/services/space-service.ts:21` also sets true, used when creation omits policy (:82). This is a per-space policy, not a server module activation flag.
- Fresh createRequest checks frozen policy.enabled at `modules/review/src/request-service.ts:49–50`; false invokes invalid(), fixed VALIDATION_ERROR/400. The check is inside fresh idempotent action, so it does not replace historical same-key confirmation with a later policy decision.
- Capabilities modules_enabled is literal core/fts5/sqlite-wal plus artifacts when artifactBackendConfigured (`packages/server/src/routes/meta.ts:14`); no review flag/module instance drives it today. Root must decide minimal server workspace dependency declaration and public activation reporting; client/CLI should continue using HTTP rather than importing review business services.
