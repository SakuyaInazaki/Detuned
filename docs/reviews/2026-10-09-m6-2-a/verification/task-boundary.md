# M6.2-A 根任务边界

父任务书是已封存 M6.1-B/planning/m6-2-a-task.md，SHA256 `3df0a90a0b49e9e9747b1dc186de6963aa6043f0ea364598bc902a650a943a46`。M6.1-B whole394已接受封存，未来schema4/封存初评/明确证据公开不冒当前schema3行为；历史审查8792全部保护。当前仅fresh/exact-before与原schema3 built code捕获，无产品编辑或门禁运行。

- 必须保旧schema3 create/cancel确认及旧key replay严格deepEqual，不增加submitted_count；当前read采用独立Details，固定roster仍公开。
- 最后一份submit触发公开前，需守卫已存在的所有初评及其明确evidence当前ACL/红删，而非仅新提交者evidence。
- 新core review-submission-records.ts只intrinsic，不能core反向依赖module。
- 私有artifact metadata不得伪装space：旧ArtifactMetadataSchema/publicupload精确保持，新增ReviewArtifactMetadataSchema及ReadableArtifactMetadataSchema union用于原artifact GET读取，私有review_assignment_id绑定。额外capture protocol artifacts/response-guards/openapi、server artifact route、client/client与artifact-transfer，仅候选capture不授编辑，singleowner由根dispatch。
- historical-v3-review-history JSON/README归D：只原冻结schema3服务提取的无秘密研究seed/typedrefs/精确response及来源SHA/配方，不能未来schema4 relabel旧3；正式回归不得依赖旧tmp或执行整个旧闭包。本轮先冻结74JS+4packageJSON及锁定第三方引用，提取执行会在单独owned短寿命串行窗口，凭据/instance secret始终只tmp内存，不入repo/log。当前fixture路径仍missing，无placeholder。
- 本机全局单执行窗口，workspace并发1、worker1/文件串行，必要两个child竞态有界清退；原断言/timeout不降。禁止VM/Colima/守护/浏览器/安装/模型/推送/global配置，不操作已清两目录或其他资源。

尚未执行旧3oracle提取、业务测试、build、schema生成/迁移；现exact-before全命中fresh，SQL3/profile/原service已保护。新候选path存在状态由before-manifest真实登记，可选maintenance测试不造冗余空文件。

## 根实现放行后追加硬边界

A新增protocol response-guards所有权仅readable metadata guard；旧upload不改。collecting且count>0的current RequestReadView不得由changed_by暴露已提交者：独立read DTO该字段nullable且遮蔽null，immutableversions内部保真，create/cancel base确认和历史replayexact保持；roster原已公开，不粗糙全禁actorID。

最终reveal同txn必须遍历旧+新全部submission的evidence，用内部void assertStoredSubmissionEvidencePrivacy(storage,spaceId,submission)校intrinsic/binding/same-space/redaction，无材料返回，也不是online read授权。caller先当前space/snapshot/qualification。旧evidence redacted应privacy优先410；已missing/failed则privacy后409 SNAPSHOT_STALE；末位submission/count/version/event/key全rollback，旧sealed保持，不能末位ordinary身份读别人private而永远404。

原3oracle首次已经真实提取成功：original服务两create/cancel refs/确认严格原形，另collecting请求；持久fixtureJSON/README位于tests/fixtures，凭据/secret不入repo，tmp已清。生成器首次一次必要代码生成0（单窗）另存schema4-generation-first.json，不算build/test通过；统一gates仍等两ownerfreeze。
