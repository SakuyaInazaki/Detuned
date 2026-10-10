# M5 概览、本人权限及创建顺序事实

仅只读事实与兼容候选，不冻结实施、不运行测试或新增依赖。

## 可复用接口与有限展示

- `AuthService.getMe`（core/services/auth-service.ts:91–95）返回当前 actor、credential capabilities、allowed_space_ids 和最多100个 visible_spaces `{id,slug,role}`。每次刷新认证，适合“本人身份/凭据能力/当前列出的空间角色”；100项展示不是完整 ACL 白名单，也不代表某项具体 mutation 必然获准。现 sharedclient getMe 可直接复用，不应在 Web 推演权限规则。
- `SpaceSchema/SpaceRevisionSchema`（protocol/spaces.ts:49–72）已有 current_revision、policy_revision、acl_epoch 与 objective/rules/review_policy/check_profiles/pinned_refs/editor/time。现 routes/spaces.ts 的 `/spaces/:space_id` 是 PATCH，不能假称已有根 GET space。固定规则读取入口是 `/spaces/:space_id/revisions/:revision`，sharedclient `getSpaceRevision`（client.ts:715）提供现有有界分段读取。
- `ContextService.getContext`（core/services/context-service.ts:26–190）同步 snapshot 刷新身份并 require observer；max_bytes4096..65536/default12288，完整信封预算。data 已含 slug、space_revision_ref、policy_revision、objective/rules、pinned_summaries、blocking_objections、recent_failures、recent_activity、checkpoint_token，可选 focus_thread。可作为概览主体，不需要为了首页新增 aggregate API。
- 置顶摘要只接受同空间 active summary 的固定 ref；有 title/summary、has_newer_revision、source_refs 与 missing_fields（context-service.ts:66–83；protocol/search.ts:179–182）。这是已知修订/来源状态，不能扩称所有历史规则或研究结论都已重新验证。
- 未解决异议最多10项；近期失败最多5项、活动最多5项且过滤 public（context-service.ts:87–138）。整体预算还会依次裁剪活动/失败/异议/摘要；meta.truncated 明确不完整，next_cursor 不提供这些数组的完整历史分页。规则太大时 `space_content_status='omitted_for_budget'`，objective/rules 为 null，页面应链接固定规则读取，不把 null 当无规则。
- “开放问题”可沿现 getView(...,'open-questions') 的数组接口，不能用概览10项异议冒充全部问题。接入入口/本机接入配置是指南信息，现 context 无接入状态字段；不应编造 host 在线、模型已连接或 ACK 理解状态。

## 创建顺序真实缺口

- `CryptoIdGenerator.generateId` 用 randomUUID（core/ports/id-generator.ts:1–11），post-service.ts:92 创建 pst ID。因此 id 的字典序不保证 created_at 或提交顺序。
- `SqliteStorage.listPostsInThread`（storage-sqlite/sqlite-storage.ts:740–752）按 `id ASC`、`id > cursor`；现 ThreadPosts 签名 cursor 也声明 id_asc。客户端排序当前页不能产生跨页创建全序，不能在指南声称当前讨论已按创建顺序保证。
- schema.sql 的 posts 有主键 id，但未见 `(thread_id,created_at,id)` 组合索引；该文件唯一显式 CREATE INDEX 在 events(space_id,seq)。SQL 可按 created_at,id 排序，但当前索引不足以保证大主题高效键集分页。
- 最小兼容候选是新增明确排序/独立 cursor 域的只读入口或 opt-in 参数，服务端用 `(created_at,id)` 键集与真实组合索引，同时保持旧 id_asc 默认和旧 cursor。是否允许新增索引/迁移由根裁定；不能在本事实包直接改旧端点。
- 即使使用时间+ID，时间相同/时钟回退/导入历史时也只保证确定性的记录时间排序，不保证真实事务提交先后。若需求是严格提交创建序，现 post 无专用顺序字段，需另决策而不能伪称 randomUUID 能承担。

## 安全 Markdown 可复用依赖

当前主 lock 仅检出 `marked@18.0.11`（pnpm-lock.yaml:1320/3053），来自 Pi TUI 的传递依赖（:2125–2128），不是 Web 已声明的直接依赖。未检出 remark、rehype 或 sanitize 库。marked 是解析器，不是 HTML 安全净化证明；不能仅凭已安装它就启用 raw HTML。当前纯 text/pre 展示继续安全，未来 Markdown 的直接依赖、禁 HTML/外部资源及独立 XSS 验证另由根选择。
