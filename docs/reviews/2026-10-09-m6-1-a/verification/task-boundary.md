# M6.1-A fresh 边界

主代理根已接受永久封存 M5.3-A 全217文件，合并旧review8272。此fresh只采基线与23有限exact-before，4新源缺失仅登记，不创建placeholder。依据旧包planning/m6-1-a-task.md与根后续正式dispatch；尚未实施、安装、运行门禁或操作VM/dsh/global配置。

A候选所有权：modules/review/src/index.ts、packages/protocol/src/review.ts、packages/protocol/src/tools.ts、新tests/integration/m6-review-snapshot.test.ts。B候选所有权：新modules/review/src/canonical-json.ts、tests/contracts/m6-review-canonicalization.test.ts。D候选所有权：新tests/integration/m6-review-snapshot-independent.test.ts与本包verification。其余exact-before只是事实/保护接点，不能当作授权扩大写入。

TypeBox+Static继续唯一DTO；尚未启用ToolReviewRequestOpSchema需按根正式规范复用CreateReviewRequestSchema properties。独立canonicalizer采用string→现Hasher.sha256按UTF8；旧canonicalJson原字节不得改变。code tuple=(repository,commit,source_artifact_id)，相同tuple即便复现文字不同也拒重复。AuthService/AuthenticatedContext已有core导出；当前auth需refreshContext后requireSpaceAccess，在同一readSnapshot内使用。规则来源由根指定getSpaceRevision(spaceId,space.policy_revision)，不卷入space.current_revision/pinned；policy_revision是实际修订ID。完整manifest字段/严格入口/错误映射由根正式dispatch，不由作者各自猜测。

无新dependency/SQL/schema安装或迁移计划；旧研究post/idem hasher、所有旧review/SQL/archive/lock/HEAD及宿主dist保护。ownedVM/images保留是M5.3自动审批拒绝删除的封存事实，不是这里新操作或证据；未来若获授权清退在新包记实际结果，不回写旧包。
