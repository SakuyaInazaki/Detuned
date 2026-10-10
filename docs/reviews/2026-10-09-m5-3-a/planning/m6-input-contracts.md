# M6 输入契约事实（只读，2026-10-09）

限定阅读 protocol review/spaces/posts、ReviewModule、docs03/05，并按根追加许可核 admin membership schema/创建与修改资格。未修改生产契约，未运行测试、网络或 VM。默认注解不等于业务自动补值。

## 已实现的空间、帖子和资格写契约

- `packages/protocol/src/spaces.ts:74–91`：create 必需 slug（1–64，`^[a-z0-9_-]+$`）、objective（1–2000）、rules（每项≤500）；可选完整 review_policy/check_profiles。patch 必需 expected_revision≥1，其余上述字段及 pinned_refs 可选；policy 不是 partial object，均拒额外字段。rules 数组无条数限制。
- `spaces.ts:15–25`：enabled/exclude_contributors/distinct_actors/seal_until_all_submitted/invalidate_on_revision 都是 Boolean/default true，**schema 接受 false**；distinct_independence_groups/allow_open_objections default false；required_reviewers 为整数1–5/default2；required_checks 必需字符串数组，无默认/条数/唯一性约束。上述字段均非 Optional。CheckProfile（7–11）含 verifier_actor_ids、64字符 config_sha256、description；无名单数量、hex 或非空描述规则。
- Membership 响应（spaces.ts:38–45）reviewer_eligible 无 schema 默认；创建 DTO（admin.ts:21–26）为可选 Boolean。真实 `core/src/services/admin-service.ts:62–81` 创建要求空间 owner，省略资格时 `?? true`、active=true、independence_group 默认 null；显式 false 保留。patch（84–103）同样 owner，省略资格保原值，显式 false 生效。改变默认会影响已有公开管理写语义及历史默认 eligible 成员；不能推断他们曾接受独立性审查。
- `posts.ts:179–201`：create 必需 kind/title(1–160)/summary(1–280)/body(≤65536)；tags 可选（≤20项、每项≤48），structured 可选，refs 可选（target_ref+现关系 type），artifact_ids 可选且唯一。revision 写要求 expected_revision≥1，kind 不可改（docs03:63）。refs/artifact_ids 无条数上限。
- claim/proposal（posts.ts:45–50、79–89）：statement 1–5000、assumptions 数组（每项≤1000，允许空数组/空项，无条数上限）、scope 1–1000、falsification_plan 1–2000；新 action 的 statement/scope/falsification_plan 要求非空白。严格新写验证在105–124；历史 StructuredContentSchema 仍有任意 Record 分支（132–140），不能把历史读取当已验证主张。
- failure（60–73、92–103）包含 attempt/category/assumptions/tested_scope/expected/observed/evidence_refs/evidence_state/ruled_out/not_ruled_out/retry_when；provided 新写至少一 evidence_ref，unverified 必须非空白 evidence_missing_reason。summary（75–77）至少一 source_ref。上述已实现写字段不能静默追加必填项、注入默认或改变旧 key+payload 重放。

## review.ts 已声明输入，不等于正式服务已启用

- CreateReviewRequest（31–43）严格 object：target_ref、dependency_refs、artifact_ids、code_refs、declared_contributors、reviewer_actor_ids、expected_policy_revision 全必需；reviewer_actor_ids 为1–5项，其余数组无数量/唯一性限制。code_ref 严格 `{repository,commit,reproduction_instructions}`：repository/复现说明无非空或长度限制；commit 仅40–64字符，不验证 hex/完整提交算法。无源码包/内容 hash 专用字段。
- submission（47–58）：snapshot_sha256 64字符，reviewer_session_id 非空，completion_status complete|provisional，verdict accept|changes_requested|reject，非空 coverage/checks_performed/independence_statement，evidence_refs/pending_requirements/limitations 数组全必需。schema 没有 complete-only、accept 无 pending 或资格判断；这是 docs05:50–56 的服务要求。
- receipt（70–79）：receipt_id、两个 observed_*_sha256（64字符）、pass|fail|error、environment、execution_steps、整数 exit_code、logs_artifact_id；除 hash 外字符串至少1字符。无开始/结束时间或独立工具版本字段，docs05:105 的时间要求尚无 DTO 落点。Finalize（83–85）仅可选 expected_phase；Cancel（89–91）reason 1–500；文件未声明 create-check-run DTO。
- review 请求无 request_key body 字段；docs05:33 提到 key，不能直接据此增加 JSON 字段或声称 endpoint 已实现。docs03:110、219 明确 formal review/check 为 not_enabled。现模块只有 manifest 方法，无提交/封存/揭示/finalize 服务；导出的规划 DTO 与已验收 v0.1 写能力必须分层描述。

## 材料来源和当前 manifest 差距

`modules/review/src/index.ts:50–103` 从目标与显式 dependency 的固定 revision 取得 content_hash，核同 space；依赖排序，artifact_ids/contributors 排序。读取当前 space 修订的 policy_revision/required_checks，未核 expected_policy_revision；code_refs 直接引用请求数组（94），未复制或排序。方法无 auth 参数、事务、资格/贡献者集合或附件可用性校验，不能作为完整安全入口。

主张 statement/assumptions/scope/falsification_plan 来自固定目标修订 structured（posts.ts:45–50），无需在 review 请求重复输入；现专用复现说明来自 code_refs.reproduction_instructions，自由 body 只是研究文本。manifest（模块20–40、86–98）仅含目标/依赖 ref+hash、artifact IDs、code refs、声明贡献者、policy revision、check 名称。docs05:39 要求的目标假设范围、附件 hash/bytes、源码包、rules 版本、check config 摘要尚未完整纳入，不能将旧 manifest hash 说成覆盖这些材料。

## 根在 M6.1 冻结前需裁定

1. docs05:29 强研究预设不能关贡献者排除/封存/修订失效，但现空间 policy 接受 false；需明确强预设与普通讨论的关系，不能无声明收紧现写语义。distinct_actors 的布尔配置也不能违反用户禁止同身份凑评审人数的要求。
2. 正式服务首次冻结可补有限数组/code 材料/check-run/receipt 时间字段及完整 manifest；已有导出 DTO 仍须记录兼容变化。已实现 claim/空间策略/成员写与历史结构应保读取和原幂等重放语义。
3. docs05:35 要求 owner 标 eligible，现公开创建省略即 true；根需裁是否保持默认、额外显式指定还是资格迁移。资格/贡献者并集、封存、失效与材料权限最终必须由服务业务实现，不能以客户端或 schema 布尔值代替。
