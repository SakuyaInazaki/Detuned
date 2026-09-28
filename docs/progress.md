# Detuned 实施进度追踪

更新时间：2026-09-28
状态遵循 [实施路线 (docs/08-roadmap.md)](08-roadmap.md) 与 [开发规范 (docs/11-development-standards.md)](11-development-standards.md)。

## 阶段概览

| 阶段 | 范围 | 状态 | 关键交付物 / 验收记录 |
|---|---|---|---|
| **M0** | 契约与版本冻结 | **已完成** | TS strict、协议 schema、better-sqlite3 探针、OpenAPI/9 项工具目录全量构建通过 |
| **M1** | 身份与讨论闭环 | **已完成** | SQLite 迁移、数据目录锁、认证/授权、主题/帖子修订、精确引用防漂移、写幂等重放、T01/T02/T03/T04/T09 通过 |
| **M0-R / M1-R** | **首轮实现修复与重新验收** | **已完成** | 严格修复审查缺陷 F01–F12；`check-behavior.mjs` 15/15 通过，`check-adapters.mjs` 5/5 通过；全套自动化测试 36/36 全绿；未进入 M2 |
| **M2** | 证据与可检索记忆 | 待开始 (等待维护者审阅 M2.1 进入条件) | 基础 FTS5+短词检索已在存储层就绪；M2 将聚焦流式大文件附件存储与限长上下文调优 (T05/T06/T07) |
| **M3** | 可靠消费与运维 | 待开始 | 单批次 poll/ack 基础与 ACL epoch 游标已在 core 实现；待完善离线备份导入导出脚本 (T08/T12/T13) |
| **M4** | 四类客户端接入 | 契约已冻结 | CLI (`detuned`)、stdio MCP 桥 (`packages/mcp`)、Pi 扩展 (`packages/adapter-pi`) 签名与发现已实测；四宿主实测待按环境推进 (T10/T20/D02) |
| **M5** | Web 与 v0.1 | 待开始 | Fastify 静态 Web 界面、并发基准、D01 步骤 1-4 |
| **M6** | 正式评审协议 | 待开始 | 快照生成、JCS 哈希规范、封存初评、揭示与失效状态机 (T14-T17/T19) |
| **M7** | 外部检查与 v0.2 | 待开始 | 外部验证回执、D01 完整流程贯通、v0.2 交付验收 |
| **M8** | 真实协作评估 | 待开始 | 对照实验设计与评估报告 |

---

## M0-R / M1-R 修复与重新验收结果 (2026-09-28)

对应缺陷 F01–F12 解决状态一览：

| 缺陷 ID | 等级 | 模块 | 核心问题 | 修复状态 | 验证用例 |
|---|---|---|---|---|---|
| **F01** | P1 | 权限/脱敏 | 跨空间 target_id 未校验空间归属 | **已修复** | R07 (跨空间脱敏拒绝并返回 404，原对象状态不变) |
| **F02** | P1 | 权限/范围 | 只读 Token 越权发帖；/spaces、/me 泄露越权空间 | **已修复** | R01 (只读 token 禁止写入返回 403), R02 (分页前限定 allowed_space_ids) |
| **F03** | P1 | HTTP 契约 | 路由缺少 TypeBox Schema 校验，坏字段/长标题/空 claim 未拦截 | **已修复** | R03a (未知字段 400), R03b (超长标题 400), R03c (无结构化 claim 422) |
| **F04** | P1 | 适配器/MCP | 工具 Schema 交集冲突导致分支拒绝；MCP 缺少根级 type=object | **已修复** | A01 (ToolPublish), A02 (ToolRelate), A05 (Stdio 发现 9 项工具), A06 (Stdio 真实调用) |
| **F05** | P1 | 幂等性 | 幂等操作未限定目标资源；缺失 Idempotency-Key 错误降级为 req.id | **已修复** | R05a (操作包含目标 threadId，不串位), R05b (缺失幂等键返回 400) |
| **F06** | P1 | 脱敏防泄露 | revisions 接口与幂等 result_ref 泄露脱敏正文 | **已修复** | R06 (脱敏后 revisions 掩码，幂等重放不泄露正文，410 正常响应) |
| **F07** | P1 | 事件与 ACK | 客户端伪造 through_seq 导致进度前跳；TokenSecret 静态固定 | **已修复** | R08 (ACK 严格校验服务端持久 batch.through_seq，拒绝伪造 409) |
| **F08** | P1 | 数据一致性 | initial_post 未校验类型规则、未持久化 refs、hash 计算不一致 | **已修复** | R04 (initial_post 完整持久化 declared refs 与关系事件，hash 算法统一) |
| **F09** | P2 | 订阅过滤 | 不同过滤条件静默复用旧订阅；poll 未按 thread_ids 过滤事件 | **已修复** | R09a (精确过滤条件不复用), R09b (poll 严格过滤外部 thread 事件) |
| **F10** | P2 | 存储与锁 | 缺少 schema_migrations 版本记录；进程死锁无法安全恢复 | **已修复** | R10 (初始化记录迁移版本 1), R11 (检测进程存活性 ESRCH 恢复死锁) |
| **F11** | P2 | Pi 适配器 | registerCommand 双参签名不符；缺少官方必填 label 字段 | **已修复** | A03 (Pi registerCommand 双参), A04 (工具必填 label 检查) |
| **F12** | P2 | 文档真实性 | 宿主实测与 SDK 发现混淆；未标明实测状态 | **已修复** | 更新 compatibility.json，明确标注 real host 为 not_tested |

---

## 锁定版本与未决项记录 (M0.1 / M0.5)

- **Node 运行时**: Node v26.3.0
- **包管理器**: pnpm 11.28.0 (CLI v11.7.0)
- **SQLite 驱动**: `better-sqlite3@13.0.3` (SQLite 内置版本 3.53.4，已验证 FTS5 trigram 及中文分词)
- **客户端环境实测状态**:
  - `mcp-stdio-bridge`: 真实 stdio 进程通信已通过（9/9 工具发现，正向/反向调用测试通过）
  - `adapter-pi`: 官方签名契约通过；宿主实测标记为 `not_tested`（未启动付费外部模型）
  - `dsh`: `not_tested`
  - `codex`: `not_tested`
  - `claude-code`: `not_tested`
- **未决项记录**:
  - 发布名称：暂定 `Detuned`，命令名 `detuned`，发布前核查 npm 包名可用性。
  - 开源协议：建议 Apache-2.0，发布前附正式 LICENSE 文本。
  - 分页游标与上下文 Checkpoint：采用服务端 HMAC-SHA256 签名/加密 Token 机制（无状态且防篡改），在 Core 统一处理。

---

## 验收测试记录

- **审查探针脚本实测**:
  - `docs/reviews/2026-09-28-m0-m1/check-behavior.mjs`: **15/15 全部通过 (0 失败)**
  - `docs/reviews/2026-09-28-m0-m1/check-adapters.mjs`: **5/5 全部通过 (0 失败)**
- **正式自动化测试全量运行 (`pnpm test:all`)**: **7 个测试文件，36 个测试全部通过 (0 失败)**
  - `tests/integration/m0-m1-regression.test.ts` (11/11 通过)
  - `tests/contracts/m0-m1-adapters-regression.test.ts` (6/6 通过)
  - `tests/integration/m1-discussion.test.ts` (5/5 通过)
  - `packages/protocol/tests/schema.test.ts` (5/5 通过)
  - `packages/storage-sqlite/tests/storage.test.ts` (4/4 通过)
  - `tests/probes/m0-probes.test.ts` (3/3 通过)
  - `tests/contracts/cross-interface-contract.test.ts` (2/2 通过)
