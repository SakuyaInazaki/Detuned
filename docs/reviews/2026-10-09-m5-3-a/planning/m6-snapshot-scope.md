# M6.1 快照构造直接接点（只读）

2026-10-09；只核 ReviewModule 调用、直接 StoragePort/SQLite 方法及 typed structured validator。未运行测试/VM，未改变产品、DDL、资格策略或旧内容 hash。

## 调用与事务边界

限定 `rg generateSnapshotManifest|ReviewModule packages modules --glob '*.ts'` 仅命中 `modules/review/src/index.ts:42,50` 的类/方法声明，无当前产品调用者。现方法（50–103）直接读取 storage，没有自建事务；这是内存 manifest 原型，不是已启用评审 HTTP 业务。

StoragePort（packages/core/src/ports/storage.ts:66–68）已有同步 `transaction(fn)` 和 `readSnapshot(fn)`。SQLite（packages/storage-sqlite/src/sqlite-storage.ts:69–94）写事务 IMMEDIATE、嵌套复用；读 snapshot DEFERRED、已有事务复用，并明确拒 Promise 回调。这足以覆盖**纯同步、有限数据库材料采集与 manifest 构造**，也可在未来原子 request 写事务中复用；不需新增读事务框架。readSnapshot 是调用约定，不是 SQLite 强制只读，不支持把异步 blob 读取/网络放进 callback；也不能保证外部文件在整个事务内未变。当前原型尚未使用此边界。

## 可直接复用的有限读接点

| 目的 | Port / SQLite 行 | 实际能力与边界 |
| --- | --- | --- |
| 固定目标/依赖身份 | storage.ts:118；sqlite-storage.ts:671–683 | findPostById 返回 space/thread/author/kind/current_revision/lifecycle，可核同空间和材料状态；不是 ACL 判断。 |
| 固定修订材料 | storage.ts:123；SQLite:719–737 | getPostRevision 按 post_id+revision 取五字段/hash/editor；redacted 时替换正文/hash，需先明确拒不可用材料，不可把 `'redacted'` 当正常摘要。 |
| 全部历史编辑者 | storage.ts:120–124；SQLite:686–695、740–775 | listPostRevisionMetadata 用 revision DESC keyset、limit+1/has_more，返回 editor_id/hash，无正文；可有限分页聚合所有 editor，另加 Post.author_id。legacy listPostRevisions 也有 editor，但加载完整正文，默认20，非最小读取。不得只读第一页或只到目标 revision 就声称“全部历史”。 |
| 显式附件 hash/bytes | storage.ts:153；SQLite:1057–1073 | findArtifactById 返回 state/space/visibility/owner/hash/bytes/storage_key；足以查每个显式 ID 是否 ready 并纳 hash/bytes；业务须授权，不把私有字段进入公开 manifest。DB ready/记录 hash 不等于此次重新验证物理 bytes。 |
| 固定修订关联附件 | storage.ts:122；SQLite:698–716 | listRevisionArtifactMetadata 按 artifact id keyset，限定 space 可见附件，ready/missing 带 metadata，redacted 墓碑不带旧材料；只适合该公共关联范围，不替代显式私有评审附件授权。 |
| 空间规则/策略版本 | storage.ts:86,90；SQLite:193–202、288–303 | findSpaceById + getSpaceRevision 固定 revision 返回 objective/rules/review_policy/check_profiles/pinned_refs/editor；同 snapshot 可冻结当前版本并核 expected_policy_revision，现原型尚未核。 |
| 成员事实 | storage.ts:98；SQLite:354–365 | getMembership(space,actor) 返回 role/active/eligible/group；可对有限候选 actor 读取。这里不裁定资格/virtual owner 策略。 |

## 贡献者并集与最小缺口

已有 Post.author_id + 每个纳入帖子的**全部** revision metadata.editor_id + declared_contributors 可生成有限 ID 并集；历史编辑者读取不需新增 port。需根冻结纳入帖子数、各历史数量和总扫描预算；达到预算必须拒/明确未完成，不能截断后给错误独立性结论。此路线不是递归依赖抓取，也不推断代码实际作者。

在上述有限 DB 快照范围内，未发现必须新增的 storage 读 port。真正未实现的是构造逻辑：同步统一事务、状态/授权/版本校验、全历史并集、完整 manifest 字段与集合确定顺序、严格独立 JCS 输入规则。若根要求**物理附件本次 hash 验证或源码包内容验证**，现 StoragePort 仅 metadata，不具备该 I/O 证明；需另定 blob/source 材料接口和 DB/文件一致性边界，不能把现 ready 元数据包装成内容验证。request/snapshot 原子持久化 port 不在本次只读范围内，不能当已存在。

## 目标 structured 校验复用

`packages/protocol/src/posts.ts:105–124` 的 `parseNewTypedStructured(kind,structured)` 可对 claim/proposal 使用严格新写 schema（statement/scope/falsification_plan 非空白、四字段严格 object），成功返回原输入、不填默认。历史 StructuredContentSchema（132–140）含任意 Record fallback，不足以确认目标是一份完整主张。正式快照可显式校验历史固定材料，但需根决定不合格历史材料的错误语义；不要回写历史 structured 或改旧 post hash。assumptions/scope/复现计划取固定目标修订，code 复现说明仍取显式 code_refs，不能互相替代。
