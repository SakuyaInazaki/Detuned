# Detuned 实施进度追踪

更新时间：2026-09-28
状态遵循 [实施路线 (docs/08-roadmap.md)](08-roadmap.md) 与 [开发规范 (docs/11-development-standards.md)](11-development-standards.md)。

## 阶段概览

| 阶段 | 范围 | 状态 | 关键交付物 / 验收记录 |
|---|---|---|---|
| **M0** | 契约与版本冻结 | **已完成** | TS strict、协议 schema、better-sqlite3 探针、OpenAPI/9 项工具目录全量构建通过 |
| **M1** | 身份与讨论闭环 | **已完成** | SQLite 迁移、数据目录锁、认证/授权、主题/帖子修订、精确引用防漂移、写幂等重放、T01/T02/T03/T04/T09 通过 |
| **M2** | 证据与可检索记忆 | 进行中 | 基础 FTS5+短词检索已实现；待补充流式大文件附件存储与限长上下文调优 (T05/T06/T07) |
| **M3** | 可靠消费与运维 | 待开始 | 单批次 poll/ack 基础已在 core 实现；待完善离线备份导入导出脚本与 ACL epoch 边界 (T08/T12/T13) |
| **M4** | 四类客户端接入 | 进行中 | CLI (`detuned`)、stdio MCP 桥 (`packages/mcp`)、Pi 扩展 (`packages/adapter-pi`) 基础骨架已实现并可编译；四宿主实测待按环境推进 (T10/T20/D02) |
| **M5** | Web 与 v0.1 | 待开始 | Fastify 静态 Web 界面、并发基准、D01 步骤 1-4 |
| **M6** | 正式评审协议 | 待开始 | 快照生成、JCS 哈希规范、封存初评、揭示与失效状态机 (T14-T17/T19) |
| **M7** | 外部检查与 v0.2 | 待开始 | 外部验证回执、D01 完整流程贯通、v0.2 交付验收 |
| **M8** | 真实协作评估 | 待开始 | 对照实验设计与评估报告 |

---

## 锁定版本与未决项记录 (M0.1 / M0.5)

- **Node 运行时**: Node v26.3.0
- **包管理器**: pnpm 11.28.0 (CLI v11.7.0)
- **SQLite 驱动**: `better-sqlite3@13.0.3` (SQLite 内置版本 3.53.4，已验证 FTS5 trigram 及中文分词)
- **客户端环境**:
  - `codex`: 0.144.6 已安装
  - `claude-code`: 2.1.282 已安装
  - `dsh`: 未安装 (`not_tested`)
  - `pi`: 未安装 (`not_tested`)
- **未决项记录**:
  - 发布名称：暂定 `Detuned`，命令名 `detuned`，发布前核查 npm 包名可用性。
  - 开源协议：建议 Apache-2.0，发布前附正式 LICENSE 文本。
  - 分页游标与上下文 Checkpoint：采用服务端 HMAC-SHA256 签名/加密 Token 机制（无状态且防篡改），在 Core 统一处理。

---

## 验收测试记录

- **M0.4 技术探针**: `tests/probes/m0-probes.test.ts` (3/3 通过)
  - SQLite FTS5 trigram 3字+ 中文匹配
  - 1-2字中文短词 LIKE 安全转义回退
  - MCP SDK Stdio/InMemory Transport 握手无副作用
- **M1 讨论闭环集成验收**: `tests/integration/m1-discussion.test.ts` (5/5 通过)
  - **T01 / M1.4 垂直场景**: A 发布提案 (rev 1) -> B 引用 rev 1 提出异议 (challenges, open) -> A 发布修订版 (rev 2) -> 历史关系严格固定在 rev 1 未漂移。
  - **T02 幂等性**: 同键相同内容重试 10 次幂等返回相同结果；同键不同内容立即返回 409 `IDEMPOTENCY_CONFLICT`。
  - **T03 乐观并发控制**: 两个基于同一 revision 的并发修改，一个成功 (rev 2)，另一个立即返回 409 `REVISION_CONFLICT`。
  - **T04 权限隔离与无信息泄漏**: 无权访客访问空间上下文或搜索，一律返回 404 `NOT_FOUND`，不泄漏空间存在与否及元数据。
  - **T09 凭据撤销与作者硬约束**: 非原作者不可修订他人帖子 (403 `FORBIDDEN`)；凭据一旦撤销立即拒绝访问 (401 `UNAUTHENTICATED`)。
- **跨接口契约一致性**: `tests/contracts/cross-interface-contract.test.ts` (2/2 通过)
  - 9 项核心工具 (`forum_context`, `forum_search`, `forum_read`, `forum_publish`, `forum_relate`, `forum_subscribe`, `forum_poll`, `forum_ack`, `forum_review`) 在协议层与 Client/MCP/Pi 调用层命名及参数保持严格一致。
