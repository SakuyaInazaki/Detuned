# Detuned 实施进度追踪

更新时间：2026-09-28
状态遵循 [实施路线 (docs/08-roadmap.md)](08-roadmap.md) 与 [开发规范 (docs/11-development-standards.md)](11-development-standards.md)。

## 阶段概览

| 阶段 | 范围 | 状态 | 关键交付物 / 验收记录 |
|---|---|---|---|
| **M0** | 契约与版本冻结 | **已完成** | TS strict、协议 schema、better-sqlite3 探针、OpenAPI/9 项工具目录全量构建通过 |
| **M1** | 身份与讨论闭环 | **已完成** | SQLite 迁移、数据目录锁、认证/授权、主题/帖子修订、精确引用防漂移、写幂等重放、T01/T02/T03/T04/T09 通过 |
| **M0-R / M1-R** | 首轮实现修复与重新验收 | 已完成 | 修复审查缺陷 F01–F12；`check-behavior.mjs` 15/15 通过，`check-adapters.mjs` 5/5 通过；全套自动化测试 36/36 全绿；未进入 M2 |
| **M0-R2 / M1-R2** | 第二轮根因修复与验收收口 | 已完成 | 解决 R2-F01–R2-F09 六项 P1 与三项 P2；`check-remaining.mjs` 12/12 通过，`check-cli.mjs` 3/3 通过；9 个测试套件 51/51 项全部通过；未进入 M2 |
| **M0-R3 / M1-R3** | **第三轮架构闭环与不变量收口** | **已完成** | 完成 R3-A（权限/脱敏业务边界）、R3-B（不可变幂等与升级迁移）、R3-C（全链路取消与官方 Pi SDK）；T01–T11 探针 11/11 全通；10 套测试 62/62 项全绿；未进入 M2 |
| **M2** | 证据与可检索记忆 | 待开始 (等待维护者审阅 M2.1 进入条件) | 基础 FTS5+短词检索已在存储层就绪；M2 规划聚焦流式大文件附件存储、配额与限长上下文调优 (T05/T06/T07)，**无向量检索任务** |
| **M3** | 可靠消费与运维 | 待开始 | 单批次 poll/ack 基础与 ACL epoch 游标已在 core 实现；待完善离线备份导入导出脚本 (T08/T12/T13) |
| **M4** | 四类客户端接入 | 契约已冻结 | CLI (`detuned`)、stdio MCP 桥 (`packages/mcp`)、Pi 扩展 (`packages/adapter-pi`) 签名与发现已实测；四宿主实测待按环境推进 (T10/T20/D02) |
| **M5** | Web 与 v0.1 | 待开始 | Fastify 静态 Web 界面、并发基准、D01 步骤 1-4 |
| **M6** | 正式评审协议 | 待开始 | 快照生成、JCS 哈希规范、封存初评、揭示与失效状态机 (T14-T17/T19) |
| **M7** | 外部检查与 v0.2 | 待开始 | 外部验证回执、D01 完整流程贯通、v0.2 交付验收 |
| **M8** | 真实协作评估 | 待开始 | 对照实验设计与评估报告 |

---

## M0-R2 / M1-R2 修复与重新验收结果 (2026-09-28)

对应缺陷 R2-F01–R2-F09 解决状态一览：

| 缺陷 ID | 等级 | 模块 | 核心问题 | 修复状态 | 验证证据 |
|---|---|---|---|---|---|
| **R2-F01** | P1 | 脱敏/幂等 | 幂等缓存完整正文导致脱敏被历史重放绕过；redactions 插入失败未回滚 | **已修复** | S01 (主题 initial_post 重放不泄露正文), S02 (标签重放不泄露), S10 (审计触发器失败全部回滚) |
| **R2-F02** | P1 | 密钥/检查点 | 存在硬编码开发密钥；checkpoint 缺乏 actor/seq 约束可前跳 | **已修复** | S04 (拒绝伪造/未来序号 checkpoint), S05 (checkpoint 严格绑定请求者 actor) |
| **R2-F03** | P1 | 幂等范围 | 异议 resolve/reopen 幂等操作范围未包含 target relationId | **已修复** | S03 (同 key 解析两个不同 relation 返回目标结果，绝无假报成功) |
| **R2-F04** | P1 | CLI/契约 | CLI 传额外字段被 HTTP 严格 schema 拒绝；标题 160 字符误判 160 字节 | **已修复** | S08 (60 汉字 180 字节标题 201 成功), S09 (严格 failure 校验), CLI post/rev/withdraw 3 项全部退出码 0 |
| **R2-F05** | P1 | 权限授权 | 凭据 capabilities: [] 仍能读取内容；allowed_space_ids 边界未收敛 | **已修复** | S07 (空 capability 凭据读 context 返回 403), allowed_space_ids=[] 严格过滤 0 空间 |
| **R2-F06** | P1 | 生命周期 | bootstrap 失败残留 human actor 导致无法重新初始化；serve 未初始化启动 | **已修复** | S11 (凭据插入异常后重开文件库重试成功产生 adminToken), serve 检验初始化且安全停机 |
| **R2-F07** | P2 | 订阅过滤 | thread_ids 订阅漏掉该主题内的 relation.created/resolved/reopened | **已修复** | S06 (线程内两个帖子建立异议关系事件成功投递到订阅者) |
| **R2-F08** | P2 | Pi 适配器 | execute 错误返回普通 isError 对象违反 Pi 抛错契约；未贯穿 signal | **已修复** | S12 (Pi execute 抛错通过), AbortSignal 贯穿取消立即中断请求 |
| **R2-F09** | P2 | 文档/目录 | 宣称全部闭环与未实现 forum_review 混淆；pnpm 依赖版本未厘清 | **已修复** | 活动工具目录仅公开 8 项已实现工具，更新 compatibility.json，固定 pnpm CLI 11.7.0 |

---

## M0-R3 / M1-R3 交付与验收收口 (2026-09-28)

三包交付成果对照：

| 分包 | 核心业务目标 | 关键改动与实现边界 | 验收探针 | 自动化回归 |
|---|---|---|---|---|
| **R3-A 权限与脱敏边界** | 业务边界收敛、脱敏闭环、ACL Invalidation 一致性 | 新建 `RedactionService`，在单一事务内执行脱敏并写入 `post.redacted` / `artifact.redacted` 事件；收敛空 `allowed_space_ids` 空间拦截（统一 404/403 并阻断枚举）；`ack()` 补充 `acl_epoch` 校验并统一返回 `RESYNC_REQUIRED` | T04 (空 space 权限一致拒绝), T05 (脱敏幂等且唯一审计与事件), T08 (ACL 变更后 poll/ack 均返回 409 RESYNC_REQUIRED) | `tests/integration/m0-m1-r3-regression.test.ts` (T04, T05, T08) |
| **R3-B 幂等与旧库迁移** | 操作结果不可变性、版本防篡改、旧版数据平滑迁移与未初始化保护 | 幂等模型重构：`extractResultRef` 记录不可变操作结果引用（如创建时版本与标题、解析关联 ID 等），重放时通过 `findRelationResolutionById` 真实实体还原；`bootstrapDatabase` 迁移前预检模式版本，保护已初始化凭据不被覆盖；旧幂等记录缓存正文脱敏清理；`serve` 预检拦截不支持版本 | T01 (resolve 重试保持 resolution 与版本), T02 (thread.create 重试锁定 v1 与原标题), T03 (旧版全量 JSON 结果重放兼容), T06 (v1 升级凭据保留与缓存正文清理), T07 (未支持版本 DDL 前拦截), T11 (CLI serve 启动拦截未支持版本) | `tests/integration/m0-m1-r3-regression.test.ts` (T01, T02, T03, T06, T07, T11) |
| **R3-C 取消链路与公开契约** | 取消全生命周期贯穿、Pi 官方 SDK 编译与工具链统一 | HTTP 客户端贯穿 `AbortSignal`（覆盖从连接到响应 body 解析完成全阶段）；Pi 适配器直接引入官方 SDK `@earendil-works/pi-coding-agent@0.87.1` 类型；根目录配置 `packageManager: pnpm@11.7.0` 并配置 GitHub Actions CI 工作流 | T09 (Pi 在线请求中断立即终止并抛出), T10 (HTTP body 解析阶段取消保持生效) | `tests/integration/m0-m1-r3-regression.test.ts` (T09, T10) |

---

## 锁定版本与工具链说明

- **Node 运行时**: Node v26.3.0
- **包管理器**: pnpm CLI v11.7.0 (锁定工作区依赖与 lockfile, `package.json` packageManager)
- **CI 工作流**: `.github/workflows/ci.yml` (自动执行 frozen-lockfile 安装、构建、类型检查、lint、测试及 R3 探针验证)
- **SQLite 驱动**: `better-sqlite3@13.0.3` (SQLite 3.53.4，WAL 模式，已验证 FTS5 trigram 分词)
- **客户端环境实测状态**:
  - `mcp-stdio-bridge`: 真实 stdio 跨进程测试通过（8/8 启用工具发现，有效/无效调用全通）
  - `adapter-pi`: 官方 ExtensionAPI 契约通过（编译对齐 `@earendil-works/pi-coding-agent@0.87.1`，抛错语义、signal 取消通过）；宿主实测标记为 `not_tested`（未启动付费外部模型）
  - `dsh`: `not_tested`
  - `codex`: `not_tested`
  - `claude-code`: `not_tested`
- **关于 M2 范围澄清**:
  - M2 任务聚焦于对象存储流式附件、结构化失败记忆与上下文预算，**无向量检索任务**。

---

## 验收测试全量记录 (2026-09-28)

- **第三轮架构闭环与不变量探针实测**:
  - `docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs`: **10/10 全部通过 (0 失败)**
  - `docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs`: **1/1 全部通过 (0 失败)**
- **前轮审查探针全量回归复测**:
  - `docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs`: **12/12 全部通过 (0 失败)**
  - `docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs`: **3/3 全部通过 (0 失败)**
  - `docs/reviews/2026-09-28-m0-m1/check-behavior.mjs`: **15/15 全部通过 (0 失败)**
  - `docs/reviews/2026-09-28-m0-m1/check-adapters.mjs`: **5/5 全部通过 (0 失败)**
- **全量自动化测试 (`pnpm test:all`)**: **10 个测试文件，62 个测试全部通过 (0 失败)**
  - `tests/integration/m0-m1-r3-regression.test.ts` (11/11 通过)
  - `tests/integration/m0-m1-r2-regression.test.ts` (12/12 通过)
  - `tests/contracts/m0-m1-r2-adapters.test.ts` (3/3 通过)
  - `tests/integration/m0-m1-regression.test.ts` (11/11 通过)
  - `tests/contracts/m0-m1-adapters-regression.test.ts` (6/6 通过)
  - `tests/contracts/cross-interface-contract.test.ts` (2/2 通过)
  - `tests/integration/m1-discussion.test.ts` (5/5 通过)
  - `packages/protocol/tests/schema.test.ts` (5/5 通过)
  - `packages/storage-sqlite/tests/storage.test.ts` (4/4 通过)
  - `tests/probes/m0-probes.test.ts` (3/3 通过)
