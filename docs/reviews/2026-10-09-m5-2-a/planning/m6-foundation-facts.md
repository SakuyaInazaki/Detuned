# M6基础有限事实（未实施/未运行）

## 现有对象与缺口

`packages/protocol/src/review.ts:4–111`已定义phase/verdict/completion、CreateReviewRequest/Submission、SubmitCheckReceipt、finalize/cancel输入；`spaces.ts:8–56`已有check_profiles/review_policy及member eligibility/group。它们不是已启用的正式评审服务。`modules/review/src/index.ts:42–105`仅ReviewModule.generateSnapshotManifest读研究材料、计算并返回内存manifest/hash；没有持久create/assignment/submission/reveal/decision/checkrun方法。`core/ports/storage.ts`无这些对象port，`storage-sqlite/src/schema.sql`没有这些表，仅artifacts的review_assignment_id/check_run_id预留字段(145–146)，不是有效FK与隔离实现。

## JCS及manifest风险

- `core/src/ports/hasher.ts:8–32`递归object key `.sort()`、array保序、primitive JSON.stringify；不是严格RFC8785输入校验：undefined映null，非有限number经JSON.stringify成为null，未拒孤立surrogate。不能将其直接标为完整JCS证明；也不能无意改已有post/idem哈希兼容。
- `modules/review/src/index.ts:80–98`dependencies使用localeCompare，artifact_ids/contributors/check_names排序但不去重，code_refs保输入顺序。集合确定排序键、重复语义及locale-independent规则须根裁；array研究正文顺序须保留。
- 现manifest只有target/dependencies内容hash、artifact IDs、code refs、declared_contributors、policy_revision/check_names。缺docs05§3的附件hash/size、实际源码材料、规则版本、check配置摘要等；也未计算所有纳入修订作者/编辑者排除并集。target读取未拒withdraw/redacted等lifecycle/材料不可用，expected_policy_revision未核。
- 本次限定`rg ReviewModule|canonicalJsonStringify tests modules/review`未找到正式JCS/manifest回归测试（历史runtime bundle含同旧helper不算测试）；没有执行测试。建议M6单独严格快照canonicalizer与RFC向量/集合顺序合同，保旧研究hash不变。

## schema2→3精确联动接点

候选修改`storage-sqlite/src/schema.sql`、`scripts/generate-schema.mjs`/`extract-schema-requirements.mjs`生成`src/schema.ts`profiles；`bootstrap.ts:26,48,522–551,559–586,666+`当前CURRENT_SCHEMA_VERSION=2、结构/marker一致性分类、IMMEDIATE原子bootstrap/迁移和serve协调，需要明确v2 legacy→v3路径、blank新建及future拒，不能只加表不改profiles。旧historical-v1 fixture不可改写。

`offline-backup.ts:15,50,145,224`硬固定schemaVersion2/current2；`offline-upgrade.ts:30,56`明确source1→target2；`protocol/export.ts:17`source.schema_version=2且formal_review/check=not_enabled；`logical-import.ts:58,65`写artifact预留字段null及not_enabled来源summary。升级需根明确旧format支持/新target和新表是否进入物理恢复、公开logical export是否继续排除sealed、import不能伪认证；不能把备份v1/逻辑wire v1自动扩为认可formal对象。当前runtimeindex/readiness等current-version点也须受控核单源版本；这份报告不自行选择兼容政策。

## 资格/权限契约待裁

`admin-service.ts:62–101`仅owner可create/patch成员，reviewer_eligible默认true；`auth-service.ts:137–167`无member的instance-admin构造virtual owner且eligible=true，角色等级observer<contributor<maintainer<owner。docs05§2要求owner标eligible且排除贡献者；现默认true与“显式标记”可能有契约冲突，是否追溯要求/默认改变需根决定，不自行拒历史成员。author-or-maintainer request/finalize、maintainer checkrun/cancel、独立actor/group、有效真实member/session归属均还需评审服务强制；不要用virtual admin资格凑研究人数。

## 可审阅M6.1最小纵片候选

先严格bounded snapshot manifest/JCS →事务创建review_request+snapshot+固定assignments →授权固定快照读取/仅数量进度；准确输入/response schema、StoragePort事务CRUD、SQLite v3迁移、core ReviewService、server routes/composition、client薄wrapper及真实SQLite权限/重放/迁移测试。sealed submission/reveal、checks/finalize/validity应按后续独立纵片明确接续，不能仅创建request就宣布M6完成。创建阶段必须当前auth、target/dependency/artifact可用性、policy/check配置、owner资格及贡献者并集、名单恰等required_reviewers、幂等/event同事务。

待根裁最多四项：M6.1对象/字段边界；完整code材料绑定字段（现code_refs只有repository/commit/instructions）；eligible默认/virtual-admin语义；schema3物理/逻辑兼容与sealed输出策略。以上均事实/候选，不改变docs05，不新增空包/DDL/依赖，不预填验收。
