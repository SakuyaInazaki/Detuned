# M6.4-C.2A 草案：知识视图的正式状态投影

状态：根已决定下层合同；Web 范围及最终文件所有权待根结合 B 事实冻结。C1 尚在验收，本任务未 fresh、未实施、未验证。下一 C.2B 才实现公开意见检索。

## 已决定行为

1. 新 core `readReviewStatusFacts` 薄汇聚既有 intrinsic records、validity 与冻结 manifest.required_checks 的 not_required/pending 计算。不得 core 反向依赖 review module、复制公式或伪造 M7 passed。现 ReviewStatusService 保留当前 Auth/同一 readSnapshot 边界，改为复用此接点。
2. findings/failures 整次 getView 使用同一 outer readSnapshot：先现有 refresh/observer 权限，再通过 Space.policy_revision 读取实际 SpaceRevision，按 canonical ReviewPolicySchema 校验。非法/缺失持久配置用现安全 RESYNC_REQUIRED，绝不补默认。每条帖子用现 listPostReviewRequests(space,post,1) 取最新 all-round，复用安全 metadata status；无写入、DDL、ACK。
3. report_kind 仍 author_report，原 legacy material、relations、null、missing_fields 全保。formal_review_status 为 not_enabled | not_requested | ReviewPhase；formal_check_status 为 not_enabled | not_requested | verification_status。新增 formal_review: ReviewRoundSummary | null。
4. 无 round：当前有效政策 enabled=false 则两 flags=not_enabled，否则两 flags=not_requested，summary=null。有 round：两 flags 必须分别等于最新 round 的 phase/verification_status，并带其完整 summary；即使当前政策关闭仍保历史。summary.target_revision 固定原材料版，不跟随当前 post 修订；旧 accepted 与 superseded/challenged/invalidated 当前有效性分别展示。不得新增 trusted 标记或将 pending/not_required 当验证通过。
5. canonical DTO、严格 guards、OpenAPI 单源同步。getView 的既有数组响应与方法签名不变；仅 findings/failures 加强运行时字段一致性、日期与 space/post scope 绑定，其他 views 不扩。

## 真实接点与候选文件

- core 新 services/review-status-facts.ts；现 services/search-service.ts、knowledge-projection.ts、core/index.ts；module review/status-service.ts。现 lifecycle → records 单向依赖，汇聚不得引入反向环。
- protocol search.ts、response-guards.ts、openapi.ts；index.ts 仅实际出口需要时薄 export。复用现 review.ts ReviewRoundSummarySchema/类型，不重造状态或请求目录。
- client/client.ts 的 getView 目前仅静态泛型，候选接入新 targeted strict guard，保签名/取消/传输规则。
- server/routes/search.ts 只作为现真实 HTTP 接点核验；无业务资格复制，是否需代码变动待实际 schema 注册事实决定。
- Web knowledge.tsx 当前明确拒 formal flags 非 not_enabled，必须随新合同适配；具体 UI 文件、状态措辞、导航与测试范围等待 B 事实及根裁，不先造接口。

## 候选验收（未运行）

- 新 tests/integration/m6-knowledge-status.test.ts：真实 SQLite 启用/关闭政策且无 round、最新 cancelled/stale/accepted 等 all-round、冻结 required_checks 状态、旧 target ref、policy superseded/挑战/红删安全状态、ACL 撤销；不读封存意见或证据正文。
- 新 tests/contracts/m6-knowledge-status-contracts.test.ts：真实 HTTP/共享 client 的 strict whole-array、flags/summary 一致性及跨 space/post、非法持久 policy 的安全失败；受控坏 transport 拒未知字段/错 summary/错误状态，不能把其当真实 SQLite 权限证据。
- 选择性复用 m2-knowledge-views 与 m2-knowledge-view-contracts 的 legacy 材料/关系/null/missing_fields；既有 review status 相关回归由 D 统一选窗。新增 guards 不放宽其他 view。
- Web/browser 场景待根补充，不预填成功。所有执行由 D 唯一窗口；作者只实现/编写测试，首失败保留。

## 边界和待根项

无 SQL/迁移/依赖/锁/新路由/新 tool/一般目录/公开意见索引/M7 设计；当前 C1 产品冻结不动，旧封存包只读，VM/Colima/模型/全局配置禁令保持。
具体已知衔接：knowledge.tsx 的旧字面值拒绝会阻挡新增状态，Web 范围必须先冻结再放行；这不是选择不同下层路线。所有权 JSON 是候选，不能作为当前写入许可。C.2B 公开意见检索紧随其后。
