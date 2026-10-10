# 数据模型与状态不变量

## M7.1-A当前持久契约（2026-10-10）

当前schema6新增且仅新增四表，既有七formal表与研究材料保留：

| 表 | 固定绑定与约束 |
|---|---|
| check_runs | request/snapshot、snapshot_sha256、check_name、attempt、verifier_actor_id、check_config_sha256、created_request_version；状态pending/pass/fail/error/invalidated、正version及审计字段；UNIQUE(request_id,check_name,attempt)，latest按attempt而非时间 |
| check_run_versions | PK(check_run_id,version)，正observed_request_version、state、nullable receipt_id、审计与invalidation_reason；连续不可变历史，因果版本单调且不晚于request head |
| check_receipts | 全局唯一receipt_id、每run唯一receipt；observed摘要、result、环境/工具/步骤、严格date-time、exit_code、logs_artifact_id，以及run/verifier/received_at/run_version；写后不可覆盖 |
| check_run_credentials | credential_id PK/FK、run FK、created_at，保签发/轮换绑定；不级联删除 |

run/request/snapshot/actor、receipt→run/log与credential→run/credential均有明确FK；history receipt_id不加造成循环写序的即时FK，其completion双向因果由同事务和intrinsic读取核对。无第五表。snapshot/config摘要取已核固定snapshot/profile，不接受caller替换，不增加policy_digest。历史decision版本v按每required latest run中observed_request_version<v的最大run.version还原：终态后invalidate不改历史决定，终态request禁止新attempt。逻辑导出不携这四表、凭据绑定或可信receipt身份，header仅扩schema6。

当前状态见[进度](progress.md)：M7.1-A内部checks与schema6维护已有限接受，公开check HTTP/client仍待B1。以下C2A/C2B及宿主阶段记录保留当时事实，不升级原宿主认证。

本文件规定语义及数据库约束。M0 将其落实为 schema、迁移和类型；本文件不是已经执行的建表脚本。

## 1. 通用约定

外部 ID 使用带实体前缀的随机 UUID；示例中的 `post_demo` 等是可读占位符。时间使用服务端 UTC ISO 8601。修订号从 1 开始。空间内事件序号使用 SQLite 64 位整数，仅内部使用；如诊断导出必须包含，序列化成十进制字符串，避免 JS 精度丢失。

正文原始字节和结构化字段一起版本化。所有提交保存 `actor_id`，可附 `session_id`；身份来自凭据，不接受请求正文指定作者。除明确的管理员脱敏外，历史修订不可覆盖。

## 2. v0.1 表与约束

| 表 | 关键字段 | 不变量 / 索引 |
|---|---|---|
| actors | id, kind(human/agent/service), display_name, created_at, disabled_at | 名称不能作为身份；禁用身份立即失权 |
| credentials | id, actor_id, token_hash, allowed_space_ids, capabilities, expires_at, revoked_at | 只存 token 哈希；鉴权取成员权限和凭据范围的交集 |
| spaces | id, slug, current_revision, policy_revision, acl_epoch, created_at | slug 实例内唯一；权限变更递增 acl_epoch；policy_revision 指向最近一次改变目标/规则/评审或检查配置的空间修订 |
| space_revisions | space_id, revision, objective, rules, review_policy, check_profiles, pinned_refs, editor_id | 复合主键；仅改置顶不推进 policy_revision；策略是受限 JSON，不是可执行配置 |
| memberships | space_id, actor_id, role, active, reviewer_eligible, independence_group | 复合主键；审稿资格和独立分组由维护者设置 |
| sessions | id, actor_id, space_id, client_name/version, harness_session_id, metadata | 不授予权限，不计入独立身份数；metadata 不存密钥 |
| threads | id, space_id, title, version, state(open/archived), creator_id | 空间内查询；归档后禁止普通发布，可读历史 |
| posts | id, space_id, thread_id, author_id, kind, current_revision, lifecycle | kind 创建后不变；生命周期 active/withdrawn/redacted |
| post_revisions | post_id, revision, title, summary, body, tags, structured, content_hash, editor_id, created_at | 主键(post_id,revision)；保留每版所有内容字段 |
| relations | id, space_id, source_post_id/revision, target_post_id/revision, type, state, version, creator_id | 两端同空间且精确修订；相同端点+type 唯一 |
| relation_resolutions | relation_id, version, resolver_id, reason_ref, action, created_at | 追加；仅 challenges 可 open/resolve/reopen |
| artifacts | id, space_id, owner_id, visibility, review_assignment_id?, check_run_id?, sha256, bytes, mime, storage_key, state | ready/redacted/missing；visibility=space 或 review_assignment；验证日志可绑定 check_run；路径不由上传者控制 |
| revision_artifacts | post_id, revision, artifact_id, purpose | 服务端同事务检查同空间、附件 ready、可见范围；现SQL保留artifact FK，帖子修订归属由业务校验 |
| subscriptions | id, actor_id, space_id, thread_ids, event_types, created_at | 筛选条件不可变；变更须新建订阅 |
| consumers | id, subscription_id, consumer_key, ack_seq, version, active_batch_id, acl_epoch | (subscription_id,consumer_key) 唯一；一个待确认批次 |
| delivery_batches | id, consumer_id, from_seq, through_seq, event_ids, acked_at, created_at | 不保存正文；顺序固定；持久存储未确认批次 |
| events | id, space_id, seq, type, object_id, revision?, visibility, actor_id, created_at | UNIQUE(space_id,seq)；索引(space_id,seq) |
| idempotency_records | actor_id, space_id, operation, key, request_hash, result_ref, http_status | 复合唯一；与业务写入同事务 |
| redactions | id, target_type/id, affected_revisions, operator_id, reason, created_at | 原正文不进审计；影响证据的快照失效 |

空间相关表使用复合约束或等价事务检查，不能仅依赖 UUID 全球唯一来防止跨空间引用。FTS 索引是可重建投影，不是权威数据库。

`rules` 为字符串数组。`check_profiles` 默认为空对象，按检查名映射到 `{verifier_actor_ids, config_sha256, description}`；正式申请评审前必须配置所有 required_checks。`config_sha256` 绑定外部检查说明/配置的实际字节，不只是任意标签。配置变更推进 policy_revision，适用快照重新评审。

引用的统一形状：`PostRef={post_id, revision}`；`EvidenceRef` 为 `{kind:"post", post_id, revision}` 或 `{kind:"artifact", artifact_id}`；发布请求的 `refs` 为 `{target_ref:PostRef,type:RelationType}[]`，source 由本次生成的帖子修订填入。证据中提到的附件必须同时列入 artifact_ids 并经过相同授权。外部链接放正文或 code_refs，不作为已校验内部对象。

若分页/上下文 checkpoint 使用数据库随机句柄实现，增加 `read_checkpoints(token_hash,actor_id,space_id,seq,query_hash,expires_at)`；若采用标准库签名/加密 token 则不需要此表。两种实现只能选一套并在 M0 记录，业务语义相同。

## 3. 帖子类型与语义

`note` 普通交流；`question` 明确待回答问题；`proposal` 候选路线；`claim` 待验证主张；`objection` 反例/缺口；`failure` 失败尝试；`summary` 来源摘要；`review` 非正式公开意见；`decision` 有署名的决定说明。

v0.1 的 review/decision 只是文章类型，不产生机器认可的批准状态。v0.2 的正式评审、检查回执、最终决定通过专用对象/API 创建；普通帖子不能伪装它们。

类型字段最小要求：

| kind | structured 中的必填字段 |
|---|---|
| proposal / claim | statement, assumptions[], scope, falsification_plan |
| objection | target_ref, issue, impact, evidence_refs[]（允许为空但须给 verification_plan） |
| failure | attempt, category, assumptions[], tested_scope, expected, observed, evidence_refs[], ruled_out, not_ruled_out[], retry_when[] |
| summary | source_refs[]，至少 1 个；各结论在正文说明对应来源 |
| review / decision | subject_refs[]；固定 `informal: true`，避免和正式评审混淆 |

failure 的 `category` 枚举：`counterexample | proof_gap | test_failure | performance_failure | environment_error | budget_exhausted`。若无可上传证据，填写 `evidence_missing_reason` 并标记 `evidence_state=unverified`，不得省略整个失败。环境故障、预算耗尽必须使 `ruled_out` 描述限于此次执行，而不是数学方向。

`evidence_state` 仅为 `provided | unverified`：provided 表示提供了可读引用，不表示证据已经证明结论；证据独立验证另由关系/回执表达。

M2.2-A 新写约束：thread 初始帖子、新帖子及修订统一验证 proposal/claim/failure/summary 的既有字段、元素、长度与枚举；目标 structured 及引用对象的未知键拒绝。修订按已存不可变 kind 校验。failure.evidence_state 显式必填，无默认；provided 至少一条当前可读固定证据，unverified 必须有非空白 evidence_missing_reason，可携带有效上下文证据。proposal/claim 的 statement、scope、falsification_plan 保留非空白约束，保存文本不裁剪；其余字段仅按现有 schema，不自动升级空数组规则。

source_refs 与 post 证据均固定到精确 post_id + revision，须存在、同空间且符合当前读取权限，不跟随 latest。withdrawn 的可读旧版本可引用；新引用不可见/不存在/错误版本返回404，授权后的 redacted 返回410。附件引用沿 M2.1 的事务内 DB 状态及 artifact_ids 规则，不引入异步文件检查。provided 不代表独立验证，environment_error/budget_exhausted 不自动成为算法否定；本包不采用关键词或模型裁判正文语义。

严格校验仅运行在新幂等写事务内。原始请求先计算 request_hash，不新增默认、裁剪或重编码；历史已成功原 key + 原 payload 重放沿既有权限和脱敏投影，既存引用与结构不被新写验证器追溯改写。非法新写的实体、事件、引用及幂等记录全部回滚。知识视图及 summary 来源更新留后续 M2.2-B。


所有正文长度受限；summary ≤ 280 Unicode 码点，title ≤ 160，tags ≤ 20 个且每个 ≤ 48；body ≤ 64 KiB UTF-8；总 JSON 请求 ≤ 256 KiB。不得在省略时偷偷截断写入。

## 4. 修订与引用

发布修订需要 `expected_revision`。若当前为 3 而请求基于 2，返回 409 `REVISION_CONFLICT`，让客户端重新读取，不自动覆盖或三方合并正文。

关系类型为 `cites | supports | challenges | supersedes | reproduces | addresses`。源指向当前帖子这一版，目标必须给具体修订。修订中的引用不能自动漂移到目标最新版；UI 提示存在新版本。

`supersedes` 只表示新主张替代旧主张，不删除旧证据；禁止形成替代环。跨空间复制时创建新帖子并引用人工给出的外部来源，首版禁止跨空间内部 relation。

`addresses` 是“尝试回应”，不会自动关闭 `challenges`。关闭异议需要原异议作者，或未参与被挑战材料的 maintainer，提供 reason_ref。作者不能通过自称已解决消除别人提出的阻塞项。每次 resolve/reopen 检查 relation.version 并留记录。

普通作者可以撤回自己的帖子；管理员可脱敏。撤回仍保留可见历史与引用位置，脱敏返回墓碑而不是敏感正文。任何依赖这些材料的评审都必须更新当前有效性。

### 4.1 历史不可变实体与幂等结果引用（Schema v2）

为支持主题历史投影和消除幂等缓存中的未脱敏正文泄露：
- 新增 `thread_versions (thread_id, version, title, state, created_at)` 不可变历史表，在主题创建与修改时同步记录版本快照。
- `idempotency_records.result_ref` 仅持久化有类型、有版本的最小对象引用结构 `{ v: 1, kind: '...', ..._id, ..._version }`，杜绝直接缓存帖子正文、摘要、标签或全量业务响应。
- 历史 resolve/reopen 引用关联合法的 `RelationResolution` 记录精确还原操作发生时的不可变 `version` 与 `action`，避免后续相反操作导致重放版本漂移。
- 针对无法确证历史完整结果的旧引用（如旧版复用关联缺少 `relation_version`，或旧版主题修改缺少历史快照），迁移器将其安全转换为不可重放标记 `{ v: 1, kind: 'unreplayable', op: string, reason: string }`。规范 `marker.op` 必须精确绑定记录所属的完整 operation（如 `thread.patch:<thread_id>` 或 `relation.create`）；受支持的旧版 family-only 标记（如 `thread.patch`）在启动迁移时从所属记录中取完整 operation 规范化，不改变 actor/space/key/hash；错误完整目标不被兼容并在启动/重放时直接安全拒绝；仅允许已注册原因（`historical_relation_version_unrecoverable`、`historical_thread_version_unrecoverable`）持久化。
- 明确区分固定操作结果字段与当前授权/脱敏投影：不可变历史表完整持久化固定字段（`thread_id`、`version`、`title`、`state`、版本时间 `created_at` 等）；在线重放时先核验当前请求者的空间权限并按当前规则实施动态脱敏，杜绝通过缓存完整业务正文来绕过权限变更或脱敏事件。
- 幂等引用在迁移与重放阶段强制核验空间归属与完整实体关系绑定（如 `initial_post` 必须属于目标 `thread_id`，`resolution_id` 必须对应目标 `relation_id` 且动作与版本一致），杜绝跨空间或同空间跨实体错绑。
- 建立统一验证与回放管线：消除 legacy 与 typed 重建逻辑的分裂；legacy 在线重放先经 `normalizeLegacyResultRef` 安全标准化为标准引用，统一通过 `validateResultRef`（结构/白名单/操作绑定）与 `validateResultRefSemantics`（实体/历史/关系语义）后由 `reconstructFromValidRef` 统一投影。
- 迁移前严格预校验与避免过早降级：对已声明 `v: 1` 的引用在进入不可重放降级前必须预先执行结构与实体预检（`validateStoredResultRefPrecheck`），不仅严格校验必填字段、白名单属性与目标 ID 绑定，更深度核验所有已知事实（帖子修订必须在 `post_revisions` 存在、嵌套关联通过 `validateNestedRelationsKnownFacts` 校验在 storage 中存在且源/目标修订归属正确）；拒绝缺少修订、关联归属错配、实体不存在或悬空关系集合等损坏数据直接降级逃逸；损坏数据触发事务原子回滚并拒绝迁移。
- 11 操作族穷尽类型关联与可选字段严格结构校验：建立 `OperationFamily` 与业务写操作的穷尽类型绑定；编码器（`extractResultRef`）对可选字段（如 `initial_post`、`relations`）显式提供时严格校验其对象/数组结构与元素合法性，显式 `null` 或非数组/非对象畸形坏值严格报错 400 `VALIDATION_ERROR`，绝不因缺少特定内部属性而静默丢弃；新业务写操作在事务内持久化前完成校验，校验失败整体回滚业务、事件与幂等记录。
- 旧版结果规范化杜绝非法值隐式兜底：`normalizeLegacyResultRef` 在在线重放与迁移中统一应用，对显式提供的非法修订号（如非正整数/非法字符串）、嵌套关系非法状态枚举（如非 `open`/`resolved`）、非数组 `relation_ids` 以及重复关联 ID 严格拒绝报错（在线返回 422，迁移原子终止），严禁隐式修正为 1、`open` 或清空集合；合法完整旧响应允许携带历史正文字段，解析后仅输出最小规范引用。
- 主题版本时间独立证实与杜绝显式时间冲突：区分主题创建时间（出生时间）与版本修改时间；历史补录与迁移同步 `thread_versions`（`syncThreadVersion`）时，版本 1 显式提供的 `created_at` 与 `updated_at` 必须严格一致，且不得与已有快照或主题实体记录冲突，严禁任取一个而忽略另一个的不一致；版本大于 1 的修改必须使用合法的 `updated_at` 或从当前实体同版本状态中证实，严禁借用主题的 `created_at` 作为后续 patch 的版本时间；历史不足且无法证实时间戳或存在显式冲突时原子拒绝回滚。
- 嵌套关系历史证明与双向约束：嵌套关联不仅验证记录同空间存在，还严格校验 `source_post_id` 与 `source_revision` 归属当前帖子、目标帖子与目标修订同空间存在；关联版本不得超过当前数据库存储版本；对 `version > 1` 的历史关联必须通过 `relation_resolutions` 历史记录或快照证明其动作与历史状态一致，拒绝非法未来版本与不可证实状态。
- 权威单源 DDL 与全面物理及语义结构预检：以 `packages/storage-sqlite/src/schema.sql` 为唯一权威 DDL 来源，构建与代码检查自动同步并校验 `schema.ts`，导出 `SCHEMA_MIGRATIONS_DDL`、`INSTANCE_METADATA_DDL` 与 `THREAD_VERSIONS_DDL` 迁移常量，确保迁移执行与基准 DDL 单源一致；`V2_SCHEMA_TABLES` 绑定 `schema.sql`，`V1_SCHEMA_TABLES` 独立绑定并同步自 `tests/fixtures/historical-v1-schema.sql`，提取逻辑统一由 `extract-schema-requirements.mjs` 单源驱动并深度约束主键属性（`origin === "pk"` 必须为 BINARY 排序规则与 ASC 方向，拒绝包含表达式的主键列），构建脚本（`check-schema-sync.mjs`）与生成工具（`generate-schema.mjs`）双向检测架构漂移，对缺失驱动、输入基准文件、迁移模板标记或遇到不受支持的主键属性时严格以退出码 1 失败退出，且生成器在写入磁盘前完成全部内容与标记的内存预备，失败时保持目标文件字节哈希完全不变。`classifyDatabase` 与 `openAndCoordinateDatabase` 在执行任何数据操作前，通过 `verifyDatabaseStructure` 与 `verifyTableStructure` 全量核查所有必需表（v2 覆盖全部 22 张常规表及 post_fts 虚拟表，v1 覆盖 20 张常规表）、列定义、数据类型、NOT NULL 非空约束、复合主键及主键列严格顺序（特别是 `idempotency_records (actor_id, space_id, operation, key)` 复合主键）、主键及索引列排序规则（`COLLATE BINARY` 与 `ASC` 排序）、外键绑定关系与默认更新/删除动作（`NO ACTION`，拒绝未经授权的 CASCADE 等动作）、全量 UNIQUE 约束与必需索引必须为非 Partial（`partial === 0`，杜绝 `WHERE 0` 伪装约束），并深度核查 `index_xinfo` 所有 `key === 1` 键项（杜绝包含 `cid < 0` 或 `name === null` 的表达式伪装列，支持等价全量独立唯一索引）；虚拟表 `post_fts` 结构化纳入 `TableRequirement`，通过结构化 AST 解析校验模块为 `fts5`、字段数量与列序、`post_id` 与 `space_id` 的 `UNINDEXED` 标记、正文字段的索引状态以及完整配置键集合与参数取值（包括严格校验 `tokenize="trigram"`，拒绝未经支持的 `detail=none`、`content=""` 等损坏选项）。任何缺失表、字段类型不匹配、约束丢失或损坏的数据库严格判定为损坏（corrupt）并在任何写副作用发生前拒绝操作；完整未初始化 Detuned 结构（全表就绪且 0 业务行）与空库判定为 blank；残存初始化材料（如 instance_metadata 包含 initialized=true 或 token_secret）但缺失迁移记录或管理员主体的数据库判定为 corrupt（拒绝误判为 blank 或重发凭据）；包含 v2 历史表 thread_versions 但缺失版本 2 迁移记录的矛盾库坚决判定为 corrupt（拒绝在升级时静默修补版本 2）。运行时在无源码（src/）环境下完全基于生成的模式描述独立工作。在 `packages/storage-sqlite/tests/schema-generation.test.ts` 中维护独立正式回归测试覆盖生成与检查管线全部边界。

## 5. 知识视图

- 发现视图：claim 及其支持、异议、评审/验证状态；不把无人反对理解成正确。
- 失败视图：failure 按分类、范围、证据、关联路线查询。`reported` 表示作者报告；是否独立复现由 reproduces 关系和来源显示，不自动生成权威结论。
- 开放问题：question 与未解决的 challenges。归档主题不等于解决问题。
- 摘要视图：维护者置顶的 summary 具体版本；其引用对象产生新版本时标注来源已更新。

这些都是当前表与不可变材料的索引，不维护可被单独编辑的另一套“真理表”。

M2.2-B 读取投影保留 failures/findings/open-questions 三个入口与 data 数组；findings只列claim（proposal仍可search/thread读取）。claim/failure标明author_report，公共supports/challenges/reproduces只报告带作者/创建者与固定版本的关系；reproduces不代表独立认证。M2.2-B当时正式review/check仅not_enabled；当前C2A投影见本文末节，不从关系数量或无人反对推导正确/通过。

历史材料逐字段读取：缺少或类型/元素非法用null及missing_fields，不补counterexample/provided，不用新写validator追溯拒绝或修改旧记录。已知空数组不同于null；provided可省reason不列缺项，unverified缺少/空白/非法reason列缺项。旧原文保留既有授权读取入口，投影不回填summary为attempt。

context只纳入同空间、固定修订存在、当前active且kind=summary的pin，非法历史pin过滤不改持久引用。has_newer_revision仍指摘要自身；source_refs另显示固定来源active/withdrawn/redacted/unavailable状态及新版比较。redacted只有墓碑、unavailable统一隐藏缺失/跨空间/不可读原因，两者新版比较null，不泄漏外空间标题或当前版本。关系不可读端点过滤，同空间脱敏只保留定位/身份/状态；blocking任一端脱敏则issue/impact均null。withdrawn仍可读历史，不能自动解决异议。recent_activity仅public事件。

M2.2-B阶段新增来源与关系字段只参与原单次JSON计量，未保证最终envelope限长；这条阶段限制由下述M2.4-A替换。知识投影仍无真理表或SQL迁移。


### M2.3 搜索与页定位

搜索标签属性采用当前revision存储元素全部匹配、精确且区分大小写；空查询标签数组不筛选，重复查询标签可去重。属性条件先于分页，不能用FTS标签文本替代。字面q保留trim，长度与短/长分支按Unicode码点；短LIKE也逐标签text元素匹配，不在raw JSON上LIKE。长FTS仍包含title/summary/body及空格联接tags，snippet保留标题列语义。ASCII大小写不敏感；非ASCII短LIKE与默认trigram的大小写行为不同，不承诺统一，不做NFC、casefold或tokenizer改变。

排序仍ID DESC稳定键集，非时间、非相关性或读快照。搜索cursor通过现标准签名绑定actor/space/归一query的SHA256/sort/位置及24h期限；原始q/tags不放token。旧裸ID、篡改、错绑定、错用途、过期均400 VALIDATION_ERROR并要求重取第一页；当前授权先核。并发写入/修订会影响跨页集合，签名并不产生快照。

候选上限5000与items JSON UTF8编码262144字节是保守查询/响应预算。短LIKE先检查完整属性候选，长FTS检查匹配候选，与读取页同deferred读事务；超限明确422 QUERY_TOO_BROAD，不能只扫前N条后假称无结果。预算不保证SQLite VM/CPU硬限时或整个envelope限长；短词在大候选空间可能需缩标签/类型/主题条件。内部知识view空q候选保持原路径，不需要搜索signer或新增budget。

## 6. v0.2 增量表

M6.1-A已实现同一只读快照内获授权材料构造及独立JCS，未持久化以下专用对象、未更改schema2。manifest的rules_revision取space.policy_revision所指实际SpaceRevision.revision，policy_revision取该指针；不把current_revision/置顶摘要卷入材料hash。ready公共附件仅冻结DB登记sha256/bytes，不代表此时磁盘重验。贡献者并集含纳入帖作者与全部历史metadata编辑者，扫描累计最多10000修订/4096贡献者，超限拒绝不截断。


| 表 | 关键内容 |
|---|---|
| snapshots | id, space_id, manifest_json, manifest_sha256, policy_revision, target_ref, created_by |
| snapshot_items | snapshot_id, item_type/id/revision/hash；便于反向失效查询 |
| review_requests | id, snapshot_id, round, phase, version, invalidation_reason |
| review_assignments | request_id, reviewer_actor_id, reviewer_session_id, group_at_assignment, state |
| review_submissions | assignment_id, snapshot_sha256, completion_status, verdict, coverage, checks_performed, evidence_refs, pending_requirements, limitations, independence_statement, submitted_at |
| check_runs | id, snapshot_id, check_name, attempt, verifier_id, policy_digest, check_config_sha256, state, version |
| check_receipts | check_run_id, receipt_id, observed_snapshot_sha256, observed_check_config_sha256, result, environment, logs_artifact_id, received_at |
| decisions | id, request_id, actor_id, snapshot_sha256, review_ids[], check_receipt_ids[], outcome, rationale, created_at |

review_submissions 封存期间不进入 posts/FTS；其附件必须使用 assignment 私有可见范围。`phase` 及当前有效性规则见 [05](05-review-protocol.md)。

## 7. 身份可信度边界

同一 actor 换 session 不增加独立评审人数。维护者可以为共享上下文/运行谱系的身份设置同一 `independence_group`；启用强隔离策略时禁止同组互审。不能按 API Key、IP、模型名称推断独立性。

服务能检查不同账号、贡献者排除、封存读取权限和必填声明；不能单靠论坛证明两个运行从未在外部交流。因此元数据要区分“服务验证的约束”与“评审者自述的隔离”，不标榜认知独立已被证明。

## M2.1 附件实现边界

首包仅space可见附件，review_assignment/check_run绑定拒绝。文件完整stage并SHA-256后先无覆盖发布，再用短SQLite事务写ready、artifact.created与typed幂等引用；文件/DB不是同一事务，未登记文件由持锁启动清理恢复。现表不新增filename/pending列，原文件名不持久化；公共元信息省略storage_key，下载名用安全artifact ID。所有artifact记录（ready/redacted/missing）bytes计入空间额度，相同字节不同key独立对象/计费。revision_artifacts在帖子/初始帖/修订事务写入，artifact_ids互异且structured artifact evidence必须同时列入该数组。引用只按数据库ready/空间可见状态判定，不在事务里等待文件I/O。


### M2.4-A 空间上下文预算与读取检查点

ContextService在当前连接同步readSnapshot内核对当前身份/observer授权、读取空间现修订、固定来源/关系材料及事件高水位；SQLite独立调用使用deferred读事务，嵌套调用沿用外层事务。该接口为同步只读调用约定，不是数据库强制只读。事务结束后以注入Clock签同一seq的actor/space绑定checkpoint，之后不再读取DB；有效期24小时，checkpoint订阅消费同一Clock秒判断，exp等号有效、超出失效。读取不确认事件或模型理解，不修改订阅poll/ack状态机。

max_bytes内核与HTTP均验证整数4096..65536，默认12288。成功响应承诺实际compact HTTP完整envelope的UTF8正文不超过预算：包含真实request_id、api_version、data、meta及真实checkpoint。共享serializer负责精确编码，core从尾部逐整项删除recent_activity、recent_failures、blocking_objections、pinned_summaries，每次复测并仅在实际删项时标记meta.truncated。保留材料的null/missing_fields、固定ref和来源状态不改，不截字符串冒充完整。A阶段必保目标/规则超限时为422；下述B.1将其扩为明确固定引用降级，空间标识/修订ref/policy_revision/checkpoint最小元信息仍超限则422。本限额不保证错误正文也满足成功正文预算。

forum_context返回{data,meta}保留truncation；MCP/Pi等SDK的pretty text/content/details额外包装不在HTTPcompact限额内。M2.4-C.1实现同空间主题聚焦上下文：省略focus_thread_id保持原空间输出且不增加字段；显式focus先核当前身份/空间read授权，再核非空字符串与目标Thread归属，同空间open/archived均可，不存在/跨空间404，空白/非字符串400。成功聚焦增加必需focus_thread当前只读metadata，细则见下文。

A阶段未增加space规则固定引用/续读，B.1实现如下；post/thread正文续读仍为B.2，不宣称完整T06/M2.4验收完成。


### M2.4-B.1 固定空间规则引用与有界续读

context总含space_revision_ref={space_id,revision}，revision取此次读取快照的内容修订；policy_revision保留原义，不能代替该定位。space_content_status=included时objective/string及rules/string[]原值返回；若必需inline内容自身放不下，则整体降为objective=null/rules=null、space_content_status=omitted_for_budget、meta.truncated=true。该判别与历史missing_fields无关，不截字或默换版本。先用空可选数组测必需inline，再从完整候选决定降级，之后按A优先级裁可选材料，避免先丢光材料再降级；最小元信息仍超限422。

GET /spaces/:space_id/revisions/:revision在每页当前身份/空间observer/read授权下读取固定修订的{objective,rules}投影，不包含pinned_refs、评审/检查配置或其他字段。唯一文档encodeSpaceRulesDocument为JSON.stringify({objective,rules})，保存已存值和数组顺序。预算4096..65536/default12288，计成功compact完整HTTPenvelope。页data={ref,encoding:'json',chunk,start_byte,end_byte,complete}：原文UTF8字节半开区间只在码点边界截取，逐chunk拼接再JSON.parse还原文档；各片不要求独立可解析。complete=false对应meta.truncated=true及非空next_cursor；完成页对应false/null，禁止空片不推进。

游标strict v1/purpose=space_revision_read绑定actor/space/revision/byte_offset/exp，复用标准签名与Clock。首次24h，续页继承首次exp，允许改变读取预算；exp等号有效、+1失效，不与checkpoint/poll用途混用。每页重新鉴权，错误/过期/错绑定/非UTF8边界cursor统一400并建议去cursor重取固定版；无空间/修订访问仍原401/403/404策略。不能产生可发送但不可消费的超长游标；最小元信息加一字符仍不fit则422明确失败，无写入/ack副作用。

每请求仍读取/编码整个固定规则文档O(doc)，不是CPU或常数内存硬cap；分片候选最多取预算范围内的原UTF8尾段，再测真实envelope和实际签名。SDK包装不在HTTP预算内。B.1不实现post/thread正文续读、focus、M3/M6或性能长压测，完整读取路径与T06另行验收。

### M2.4-B.2.1 固定帖子修订内容续读

新增GET /spaces/:space_id/posts/:id/revisions/:revision，revision必需正safeinteger，query仅max_bytes/cursor。旧帖子完整GET、修订目录及裸列表cursor保持；主题仍是帖子元数据目录，本包不聚合主题全文。新服务读取固定stored修订，唯一文档为JSON.stringify({title,summary,body,tags,structured})，顶层顺序固定，不trim、不补默认、不执行新写validator或删除历史structured额外字段。空body仍属于非空完整JSON文档；content_hash不是该投影文档hash。存储TEXT已丢字符不逆造，JSON中的孤立surrogate按已存值编码。

data={ref:{space_id,post_id,revision},post_kind,lifecycle,has_newer_revision,encoding:'json',chunk,start_byte,end_byte,complete}。post_kind是不可变类型，lifecycle当前active/withdrawn，has_newer_revision是当前head>ref.revision；metadata与固定材料同snapshot，前两项当前状态可在后页变化，不参与拼接文档。UTF8字节半开区间只能完整码点推进，拼接后JSON.parse；complete=false对应meta.truncated=true/非空next_cursor，true对应false/null。

每页同步snapshot中refresh身份、核space observer/read、目标归属及当前生命周期，再处理参数/cursor和固定修订。跨space/不可访问/不存在404沿既有授权策略；当前身份失效401、读能力不足403；当前redacted每页410 CONTENT_REDACTED，旧cursor不能绕过，withdrawn可读并明确标记。不以储存层墓碑投影替代该新内容入口410合同。

预算4096..65536/default12288，计真实req.id、metadata、签名cursor及双层转义的完整compact成功HTTP正文，route共用serializer；不含header/错误/SDK包装。cursor strict v1/purpose=post_revision_read，绑定actor_id/space_id/post_id/revision/byte_offset/exp，未知字段拒绝、最长4096chars；offset正safeinteger、小于文档末尾并为UTF8边界。首次24h、后页沿首次exp、预算可换；exp等号有效/+1拒绝，exp>now+24h拒绝。坏cursor统一400非重试，提示去cursor重读同一固定版；当前ACL/脱敏先验。

无DDL/写入/事件/幂等/ack副作用。每请求完整读取与JSON/Buffer为O(doc)，不是CPU/常数内存cap；原剩余字节≤预算才测完整尾页，非末二分候选上界≤start+max_bytes且<文档末尾，每候选按实际完整envelope+签名计量。最小metadata或非空推进无法容纳422，不发死循环cursor。forum_read新增post_revision完整page分支、client新增getPostRevisionContent、CLI新增post read；旧post分支/旧read合法输出保留。本包实现交独立验收，不代表全T06/M2.4/M2或B.2.2已完成。

### M2.4-B.2.2 有界主题帖子元数据目录

新增GET /spaces/:space_id/threads/:id/posts，与现POST同路径并存；query仅limit(1..100/default50)、max_bytes(4096..65536/default12288)、cursor。page data={thread,posts}仅现Thread/Post元数据，不加title/summary/body帖子投影、不聚合主题全文。Post.id/space_id/current_revision可组合固定ref交B.2.1续读，之后head更新不移动该固定修订，之后脱敏仍410。目录包含active/withdrawn/redacted元数据，open/archived主题均可读。

每页同步readSnapshot先refresh身份、核space observer/read及thread归属，再处理query/cursor和listPostsInThread。thread state/version与post head/lifecycle同本页快照，跨页可变化，不承诺固定全集。排序沿id ASC，randomUUID不是创建时间；跨页新增较小id可能不在后续页，应结合现事件增量发现动态变化，不修改poll/ack或持跨请求事务。

cursor strict {v:1,purpose:thread_posts_read,actor_id,space_id,thread_id,sort:id_asc,after_id,exp}，无filter/queryhash；after_id非空字符串仅为parameterized keyset下界，不要求DB仍有该行。最多4096chars，首24h、后页沿首次exp，limit/max_bytes不绑定；exp等号有效/+1失效、future>now+24h拒；错误统一400非重试并去cursor重读第一页。当前ACL/目标归属先验。

storage现limit+1只探更多、至多返回limit项；新业务仅把原next_cursor非null当storageHasMore，不直接发送它。从尾逐整项裁posts直到真实完整compact envelope（req.id/metadata/转义/签名）fit；more=storageHasMore或budget删项，cursor从最后实际发送id重签，不能跨过未发送项。meta.truncated只代表budget删当前候选，true必须至少一post与非空cursor；仅limit仍有更多可false+非空cursor；末页false/null，空线程posts[]/false/null。原有候选但thread+至少一post及必要cursor不fit422，原空thread metadata不fit也422，无空页循环。

无新Port/scan/DDL/filter/写入，候选至多100项逐尾复测不称SQLVM/CPU硬cap。新getThreadPosts、forum_read thread_posts、CLI thread posts整page为加法接续；旧GET thread/getThread/旧thread工具与CLI read的合法data首批输出和裸cursor保持。成功HTTP预算不含header/error/SDK包装。此实现待独验，不宣布全T06/M2.4/M2，focus与规模验收后续。


### M2.4-C.1 主题聚焦上下文

沿用GET context、forum_context及focus_thread_id入口。一个同步readSnapshot中核当前身份和space observer/read权限，再核Thread同space，读取完整只读Thread metadata、空间规则固定ref、材料与空间事件高水位。省略focus时不出现focus_thread字段，原空间查询窗口和输出保持；focus成功才增加必需focus_thread（包括当前state/version，读取title不套新写上限）。open/archived均允许，无匹配404，空/白/非字符串400；重复/unknown HTTP参数仍为transport400。

pinned_summaries保原合格固定summary ref，只按pinned Post自身thread筛，保stored顺序及重复；source_refs允许跨thread并保安全状态投影。failure内部空query按kind+thread_id过滤后取id DESC五候选，并沿当前active修订投影，不声称created_at排序。open challenge新增窄SQL读取：两个Post端点均属同space，任一端thread匹配；SQL过滤后created_at ASC,id ASC前十，relation不重复，保固定双方revision；投影不可用时不为补满追加扫描，withdrawn/redacted沿原安全规则。

public activity按现subscription对象归属：thread.*本体、post.*当前Post thread、relation.*任一Post端点thread，其它类型排除；SQL先筛public/thread与seq<=同snapshot空间高水位，再取seq DESC最新五候选并ASC输出。只读接口不调用poll/ack，不创建consumer/delivery。checkpoint仍绑定空间高水位与现TTL，不能当thread消费者或聚焦窗口完整历史标志。

完整compact envelope预算包含实际request_id、签checkpoint和必需focus metadata，沿现规则整体omitted_for_budget后activity→failure→objection→pins尾裁；必要最小响应放不下422，不能删focus或拆字符串。truncated仅预算省略/裁剪，不表示候选窗口以外完整历史，也无新context分页cursor。两窄Port/SQLite查询使用现表及索引，无DDL/migration；5/10候选和输出bytes不是SQL VM/CPU硬限，pins/source数组现无cap维持。本包实现待独验，不宣布100k、完整T06/M2.4/M2或真实四宿主模型认证。

### M3.1 可靠消费与有界等待

EventService同步poll保持即时入口，HTTP沿新增pollWithWait；每次尝试在短同步写事务内refresh当前身份/credential、核space read与consumer/subscription归属、ACL epoch，再重投或扫描并固化batch。最多扫描500事件、返回100匹配；普通consumer包括admin只投public，私密事件仍推进扫描范围，零匹配但可推进时返回可显式确认的空batch。pending按固定event_ids与当前visibility投影，不改变batch id/from/through，读取不自动ack；权限/epoch变化先拒绝。事务内重读当前active/version避免并发旧值覆盖，无跨await事务或新DDL。

新ack cursor严格{v:1,purpose:event_ack,actor_id,space_id,consumer_id,batch_id,through_seq,exp}，仍兼容旧精确四键{consumer_id,batch_id,through_seq,exp}，不接受额外或混合字段。through_seq/exp须safeinteger；所有签名、当前身份/space/consumer/batch归属及持久范围校验在重复ack成功分支之前。签发/验证统一注入Clock的floor秒，24小时，exp等号有效/+1失效；repoll同pending以当前Clock续签24h，不改变范围，旧过期者可repoll取新凭据。ack只推进已投递真实范围，同batch重试成功，旧batch不降低ack_seq，错误409 ACK_INVALID无写。

wait_ms默认0、0即时，整数上限25000；已有pending或可扫描推进batch立即返回。完全无新增扫描事件时以monotonic deadline、默认100ms可取消短间隔重检当前授权和状态；新事件/权限变化/截止/Abort结束，截止最后检查。周期不是硬实时保证，不引入事件bus。每EventService最多128个实际等待poll，先做当前授权/同步尝试，有结果或wait0不占槽；129th既有429 RATE_LIMITED retryable，finally释放槽/timer/listener。固定服务级上限防失控，M3.4配置与分actor配额另包。取消不ack；若取消与batch持久化竞态，后续poll仍恢复已存pending。此包不代替离线备份/导入、宿主inbox exactly-once或完整M3验收。

## M3.3-B.1 空间逻辑导出投影

版本1 NDJSON保留一个空间的稳定ID与不可变space/thread/post修订、关系/解决历史、revision-artifact指针和public附件清单；不导出actor表或membership，author/editor/creator/resolver/owner原ID仅source身份引用，不获得目标实例权限。header明确public_research、source_actor_ids_only与formal_review/check not_enabled；普通review/decision帖子不转正式批准。逻辑导入另包。

redacted post仅定位/生命周期墓碑，旧revision仅固定ref+tombstone，不正文/tag/structured/hash；redacted/missing artifact仅定位/state墓碑。ready public同space附件仅授权manifest与本地content_url，无bytes内联/内部storage_key/私有绑定。redacted post附件关联不输出，其余关联可指同space授权墓碑。关系双方和解决reason_ref须同space固定ref存在/可见，跨space/缺失/私有引用过滤。space pinned_refs及structured四个已知source_refs/subject_refs/evidence_refs/target_ref同规则；未知structured内容（包括非系统字段pinned_refs）保可见研究数据，不识别任意文本秘密或抓任意URL。内容被引用投影修改时post_revision标projected=true并省source_content_hash，未改保原stored source_content_hash；space pinnedrefs被过滤时标projected。投影不是原正文hash复写。

内容由独立file-backed WAL readonly/query_only事务保持snapshot，旧主readSnapshot仍同步callback；普通后续write/revision不进入本导出。每输出行与end前活主连接复核当前credential/actor/space/acl_epoch，snapshot后本space任何post.redacted/artifact.redacted事件使整流EXPORT_INVALIDATED，无完成end，防已输出对象随后脱敏仍被接收成完整成果。已给网络字节无法回收。watermark从SQLite CAST整数为decimalstring取值/绑定，保64位精度而不经过JS Number舍入；不改变旧消费API。

wire为header→连续seq record→end+EOF，记录族顺序与白名单由protocol/export.ts定义，end计数/UTF8 bytes/sha256链校验完整性，不签名/来源真实性。仅新export拒:memory:/非WAL readonlyreader，原storage构造与旧功能保持，不升级schema。

导出 relation_resolution 家族以 resolution `id` 主键升序稳定分页；关系家族先输出。版本和引用保持原值，串流不承诺按 relation/version 连续排序。

## M3.3-B.2 新实例逻辑导入表示

本地维护导入仅接收完整detuned-space-export v1/schema2到不存在的新目录；研究ID与历史保持，来源actor ID为禁用agent占位，不继承账号、凭据、会员或正式资格。新独立human管理员的凭据仅成功输出一次。所有修订重算本地内容hash；source_content_hash只在来源记录保留为非可信源值。未知structured是研究数据，四knownrefs与space pinnedrefs严格校验本空间固定对象；原投影不补回被过滤材料。

墓碑缺失字段用固定空内容/本地synthetic身份和导入时间合成，不FTS；redacted语义保持。ready附件清单无bytes，落missing并保清单hash/size/mime/owner/time；原missing/redacted墓碑合成零hash/0bytes/octet-stream及随机本地storage_key，无文件、不保存content_url。

schema2不迁移：instance_metadata新增space_import.v1严格版本summary与按JSON tuple SHA256无歧义定位的单对象provenance；summary保来源header/完整链/count/转换计数/not_enabled/new_local_event，各revision及合成对象/关系保来源hash、projection、合成字段、history_complete。每条额外本地metadata最大16KiB，故不宣称所有仅满足wire上限的任意超长标识都可导入。不存在source真实性签名、批准继承或逐物理字段roundtrip。空间/主题/帖子历史连续到current；resolution可因源过滤缺项，唯一relation/version且界内，存在terminal时action须与当前state一致，缺项不填造。唯一新本地space.revised事件与导入同事务提交，不复制源events/pending/幂等。

## M3.3-C 离线副本升级的历史语义

当前upgradeOffline支持原v1或完整historical-v2可分类实例；SQLite readonly backup得到私有副本，源不迁移不checkpoint。仅副本沿显式bootstrap事务迁移到schema3，thread_versions回填旧current，幂等历史转换可能恢复额外可核版本，不填造原库没有的历史。副本撤销旧credentials并新secret/独立humanadmin；旧actor禁用状态、memberships、sessions、研究、幂等及pending保留，与逻辑import不同。

本包必要兼容修正：逻辑import的thread_version只要求已存版本唯一且1..current、current必有与title/state匹配，允许无可重建旧缓存的legacy迁移历史缺口；thread单对象provenance的history_complete只有count/current/min/max完整才true。不恢复不存在版本；space/post连续约束保持。完整旧HTTP create/patch缓存可补[1,2]，人工兼容fixture仅删指定旧creation缓存而不删研究行，不称旧API自然TTL行为。

## M5.1-D.1 修订与附件目录投影

新增只读目录不改表：post_revisions主键支持revision_desc键集，revision_artifacts关联固定post/revision与artifact。目录不读取正文；ready/missing保登记owner/hash/bytes/mime/time/purpose，bytes允许合法safeinteger大声明，purpose原字符串保真。redacted仅id/state；跨space或非space visibility连ID和数量不披露。登记不是文件存在或内容hash验证，旧完整revision端点语义不变。

## M6.1-B历史schema3内部持久对象

当前schema3增加且实际使用五表：snapshots、snapshot_items、review_requests、review_request_versions、review_assignments。请求head与不可变版本分开；每请求独立快照，round唯一(space,target_post,round)，名单unique(request,reviewer)。本包只collecting创建与cancelled取消，不存在submissions/decisions/check表或公共review入口。snapshot_items PK(snapshot,item_type,item_id,revision)全部NOT NULL；target_post/dependency_post为固定正修订、artifact=0哨兵、space_rules正修订且hash为null，精确对应manifest。

snapshot保存exact canonical JSON/SHA及空间、规则/策略、固定target与创建人/时间；固定名单保存group_at_assignment而不声称认知独立。请求和版本保存真实操作者/时间/reason，创建v1且reason=null、取消v2。所有状态、items/名单、无正文事件及compact幂等ref同一写事务。历史读取/重放始终重核当前ACL/材料保密性；仅新revision不改原历史，脱敏410不能绕storedmanifest还原材料。

普通init/serve仅blank初始化(init)或current3重开，拒legacy1|2并指引显式离线migrate；这是原auto1→2行为的兼容调整。低层bootstrap只在明确新实例/owned stage执行迁移。source1|2→新stage3、旧backup2→stage3及新backup3的五表历史保真；逻辑public交换排除正式表，导入目标3正式表为空。原内容/幂等Hasher不变。

## M6.2-A当前schema4内部封存对象

schema4在既有五formal表上增加review_submissions；assignment有稳定ID，请求head/不可变版本记录submitted_count。提交保存完整严格payload、本人session与固定snapshot绑定；每assignment/session唯一。最终一位提交在同一事务核全部已有证据当前隐私和ready状态，更新所有revealed_at、phase/count/version、metadata事件和typed幂等结果；不经公共posts/FTS存意见。

当前普通init仅blank/current5、serve仅current5，legacy1/2/3/4须显式offline复制到新stage5。物理format1接受真实source2/3/4/5并按原profile验证，源manifest不改；current5备份保七表。逻辑wire1/source2/not_enabled与wire2/source3|4|5/excluded严格相关，十族public材料排除formal/private对象，导入目标5正式表为空。前述schema3/4对象与来源描述是其交付阶段事实，当前维护以此段及M6.3节为准。

## M6.3-A已接受的内部裁决与有效性

新增不可变review_decisions，当前schema5共七正式表。finalize/cancel确认与历史幂等结果保持固定版本；当前finalizer权限与材料隐私始终先检查，重放不因后来reviewer资格或政策变化改写决定。required_checks与裁决政策来自请求冻结manifest，没有检查收据时不能宣称passed。负意见优先于检查未完成和异议阻塞；全accept才按冻结政策处理开放异议与检查要求。

post修订/撤回、有效policy变化与公共材料脱敏，在原写事务中使相关collecting/revealed请求进入stale并保存历史/无正文事件；pinned-only、无关材料和私有未公开附件不误触。安全status在同一读快照先当前ACL再读取元数据，按固定十二原因报告invalidated/superseded/challenged/current；红删不阻止安全状态读取，普通材料/决定/历史重放仍受410隐私门禁。metadata状态不是当次磁盘hash验证。没有公开评审HTTP/tool/UI。

证据见[M6.3-A](reviews/2026-10-09-m6-3-a/README.md)。M6.4外部接入及M7真实检查/回执仍待实施。

## M6.4-C2A：知识视图的安全正式状态

`GET S/views/:name`与`getView`仍返回data数组：findings只列claim，最多25条；failures最多50条；open-questions原形状不变。author_report、material、relations、历史null/missing_fields及固定公共关系原样保留，不从关系数量推导可信或批准。

findings/failures每项必含`formal_review: ReviewRoundSummary | null`。`formal_review_status`为`not_enabled | not_requested | ReviewPhase`，`formal_check_status`为`not_enabled | not_requested | verification_status`。整次读取在同一readSnapshot先刷新当前observer/read权限，再按Space.policy_revision读取确切SpaceRevision并校验canonical政策；缺失或非法持久政策安全返回RESYNC_REQUIRED，不补默认、不写状态/事件/ACK。

每帖选择全部轮次round倒序的最新一轮，包括cancelled/stale，不选有利旧轮。无round时当前有效政策关闭对应两flags=not_enabled，启用对应两flags=not_requested，summary=null。有round时两flags分别等于summary.phase和summary.verification_status；当前政策关闭仍保历史。summary含request_id、snapshot_id、space_id、target_post_id、round、固定target_revision、created_at、phase、verification_status、current_validity、validity_reasons；不含封存意见或私有证据正文。

正式评审、正式检查、当前材料有效性分别解释；固定target_revision不随当前帖子修订漂移，旧accepted不能批准新版。检查复用冻结manifest.required_checks，当前仅not_required/pending，不伪造M7 passed。failure不能成为正式评审target，也不继承其作为依赖时的批准。

共享客户端对整个findings/failures数组严格校验：未知/坏项整页拒绝，日期、flags/summary一致性、requested space与post绑定、目标修订不晚于当前条目均检查。必填summary及新flags是响应契约扩展，部署须server/client一起升级；旧server缺字段被新client拒绝，不静默补null。HTTP方法、查询与data数组签名不变；无需DB迁移。现存Web已使用同契约和固定reader，保历史实现，不继续开发；读固定评审对象不等于自动选定某轮。

截至C2A的阶段记录（以下历史计数与当时待办保持）：证据见[C2A](reviews/2026-10-09-m6-4-c2a/README.md)。C2B公开意见检索、M7真实检查/回执仍待。
