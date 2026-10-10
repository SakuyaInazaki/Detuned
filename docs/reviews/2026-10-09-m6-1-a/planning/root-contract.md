# M6.1-A 根冻结契约

本包 fresh c13406e6292f05a29010e971bbefcf7f89d832d3fa3fc42204e403884abbd2d6 后实施；依据 [前包任务书](../../2026-10-09-m5-3-a/planning/m6-1-a-task.md)，以下精确细化优先。仅材料构造，不开启评审/资格/持久化/DDL/HTTP/新工具或修改旧 hasher。

请求保持 TypeBox/Static 单源，顶层复现非空白≤16000；code repository 非空白≤2048，commit 40/64 小写 hex，source_artifact_id 必须显式附件；每项复现≤16000。dependencies32/artifacts64/code16/declared128/reviewers1–5，重复拒绝；code 键(repository,commit,source_artifact_id)，target 不得重复依赖。未广告工具复用同 DTO properties，不把 request_key 混入 HTTP body。

构造参数末尾必需 AuthService；generateSnapshotManifest(auth,spaceId,req) 返回 manifest/manifestHash。单 readSnapshot 先刷新身份及 observer 授权，后检查请求与读取。目标同空间 active/current claim，四结构字段用严格新写 parser；依赖同空间 active/current 固定修订。附件 ready/space-visible，实际 DB lowerhex64 SHA 与 safeinteger bytes，不声明磁盘实时核验。所有引用与 policy revision 为正安全整数。

以 space.policy_revision 读真实 SpaceRevision，先 expected 冲突检查；rules_revision 为此记录 revision。冻结完整 review_policy，required_checks≤32、非空白互异 UTF16排序；只入 required profiles，config64 小写hex、verifiers≤128互异排序，允许空名单，description 原值。pinned/current_revision 不卷入 hash；policy 指针推进仍改变 hash。

manifest 固定 version1/space_id/target{ref,content_hash,statement,assumptions,scope,falsification_plan}/dependencies{ref,content_hash}/artifacts{id→artifact_id,sha256,bytes}/code_refs/rules_revision/policy_revision/review_policy/check_profiles{check_name,config_sha256,verifier_actor_ids,description}/contributors/reproduction_instructions。不入 snapshotID/time/displayname/reviewer名单。集合 UTF16 tuple 比较，revision 数字比较；意义数组和原文字保序，不 trim/normalize。输出完全脱离输入/存储引用。

contributors 为每个材料帖子作者、全部历史 metadata 编辑者与申报名单并集；metadata keyset分页，总≤10000修订/4096贡献者，超限拒不截断、不加载历史正文。

B 提供 canonicalizeReviewJson 与 ReviewCanonicalizationError(reason invalid_json|max_bytes|max_depth|max_nodes)：262144 UTF8 bytes、root depth0/child+1≤64、root及 value节点≤20000、key不算节点；现 sha256(canonicalString) 不改旧 canonicalJson。

原 auth 错误原样；隐藏/不存在404 NOT_FOUND；可见 redacted410 CONTENT_REDACTED；withdrawn/noncurrent/notready409 SNAPSHOT_STALE；policy冲突409 REVISION_CONFLICT；非法历史/JSON/重复/配置/hash400 VALIDATION_ERROR；canonical byte413 PAYLOAD_TOO_LARGE；depth/nodes/扫描422 QUERY_TOO_BROAD。固定安全信息不回显研究内容。

作者只新增定向真实SQLite测试；D统一门禁/独验。A仅 review index/protocol review+tools/test 与本包证据，B canonicalizer，旧源/SQL/锁/依赖保护。首失败及实际命令/exit保留，根验收前不预填通过。
