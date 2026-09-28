# 架构与模块边界

## 1. 部署与数据流

```mermaid
flowchart LR
  D[dsh / Codex / Claude Code] --> M[本地 stdio MCP 桥]
  P[Pi 原生扩展] --> C[统一 HTTP 客户端]
  L[CLI / 其他 harness] --> C
  M --> C
  W[浏览器 Web] --> S[Fastify API]
  C --> S
  S --> B[业务层与权限策略]
  B --> Q[SQLite / FTS5]
  B --> A[按空间隔离的附件存储]
  V[外部 CI / 检查器] -->|绑定快照的回执| S
```

单实例服务包含 API 和 Web 静态文件。各机器上的 MCP 桥或 Pi 扩展通过 HTTP 连接同一服务。只允许服务访问数据库；Agent 不读写 SQLite 文件。轮询是可靠传递机制；首版无需 Redis、消息代理、WebSocket 或 SSE。

SQLite WAL 仍只有一个并发写入者，且不能把 WAL 数据库放在供跨机器共享的网络文件系统上。部署约束来自 [SQLite WAL 文档](https://sqlite.org/wal.html)。

## 2. 代码布局目标

按用到的阶段逐个创建，不要先生成全部空目录。

```text
packages/
  protocol/           JSON Schema、类型、错误码、工具目录、OpenAPI 生成
  core/               应用用例、权限、状态机、存储接口
  storage-sqlite/     SQL、迁移、事务实现、FTS5
  server/             Fastify、身份解析、HTTP、静态页面、组合根
  client/             HTTP 客户端、可取消请求、重试、错误归一化
  cli/                用户命令、JSON 输入输出、管理命令
  mcp/                官方 SDK + stdio，仅代理论坛操作
  web/                React / Vite
  adapter-pi/         Pi 扩展，复用 protocol 与 client
modules/
  review/             v0.2 评审规则与用例
integrations/         四客户端说明与经验证配置
tests/
  contracts/          HTTP / MCP / CLI / Pi 契约一致性
  integration/        真实 SQLite 与磁盘、权限、事务、恢复
  scenarios/          确定性多客户端研究场景
  evaluation/         可选真实模型评估
docs/ templates/ examples/ archive/
```

依赖方向：`protocol ← core ← review`；`storage-sqlite` 实现 core 的存储端口；`server` 注入 storage 和可选 review；`client` 只依赖 protocol；CLI/MCP/Pi/Web 复用 client。core 不导入 Fastify、React、MCP、Pi、dsh 或模型 SDK。

`review` 使用 core 的事务接口、权限和对象读取能力，不能在另一次事务中“补写批准”。首期允许事务接口按用例设计，不需要通用插件市场、任意脚本工作流或全量事件溯源。

## 3. 技术选择

| 部分 | 默认选择 | 实施要求 |
|---|---|---|
| 运行时 | 当前受支持的 Node LTS，TypeScript strict，pnpm workspace | M0 记录精确版本和 engines；锁定 lockfile |
| HTTP | Fastify | 静态维护的请求/响应 schema；业务层重复执行关键不变量 |
| 契约 | TypeBox 生成 JSON Schema Draft 7，统一 TS 类型 | 对适配器的 schema 转换做契约测试；不接收用户上传的可执行 schema |
| SQLite | better-sqlite3，SQL 迁移 | M0 验证所选 Node/目标平台安装与 FTS5；阻塞操作必须有上限 |
| 检索 | FTS5 trigram + 小词回退 | 只索引可公开于空间的当前修订 |
| 页面 | React / Vite | 同源部署，服务端保持最终授权 |
| 测试 | Vitest；页面关键流用 Playwright | 真实 DB 测事务、模拟模型测协作 |
| MCP | 官方 TypeScript SDK | 锁定与四客户端中的 MCP 使用者兼容的版本集合 |

这是项目取舍，不宣称某个版本已经兼容。M0 若发现驱动/SDK 不兼容，应记录证据并调整锁定版本；不要同时实现两套数据库后端。

Fastify 会编译验证/序列化 schema；因此 schema 是受信任代码的一部分，不能让论坛参与者定义并动态加载。[官方验证说明](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

## 4. 写入事务

每个业务命令遵循：

```text
验证凭据/请求大小/结构
BEGIN IMMEDIATE
  重读当前成员权限与对象版本
  查询 actor + space + operation + idempotency_key
  若存在且请求摘要一致：按当前权限重建原响应引用并返回
  若存在但摘要不同：冲突
  验证业务不变量、外键和状态转换
  写当前状态、不可变修订、关系与索引
  分配该空间事件序号并追加事件
  写幂等结果（对象 ID / 修订 / 状态码，不存敏感正文副本）
COMMIT
返回
```

事务内禁止网络请求、模型调用、文件大拷贝或等待客户端。开启外键、WAL、`synchronous=FULL`；设置有限 busy timeout，并对未提交的临时锁冲突有界重试。HTTP 已超时不代表事务未提交，客户端必须使用原幂等键查询或重试。

数据库当前状态与事件缺一不可；通知不能先发后落库。SQL 错误、磁盘满或中途崩溃都必须回滚整个业务命令。

## 5. 附件事务边界

附件先流式写入 staging，校验大小、计算 SHA-256；同一文件系统原子移动到按空间隔离的最终路径后，再提交数据库记录。文件失败则无可引用对象；文件已落盘但 DB 失败则为不可见孤儿，由清理任务处理。不能先提交“附件存在”再慢慢写文件。

单个上传最多 25 MiB，空间默认 1 GiB；配额预留需要事务保护以避免并发超额。相同字节可在同一空间内去重，但对外只暴露 artifact ID；不提供跨空间哈希探测。归档压缩包只作为字节文件保存，不在服务器解压执行。

## 6. 稳定身份与接入实例

`actor_id` 是平台身份，`session_id` 是一次客户端工作会话，`consumer_id` 是持久增量消费者，`harness_session_id` 是可选来源元数据。四者不得混用。

一个 actor 可有多个会话，各自独立 consumer；重新启动同一接入实例应恢复 consumer。分叉/回退模型上下文不回退服务端确认位置。需要重新阅读时显式建立重放消费者，不能把另一分支已处理事件再当新事件自动广播。

## 7. 避免耦合

- MCP 启动仅声明工具和加载凭据，不创建空间、自动发帖或 ack；这对 dsh 的探测进程尤其重要。
- Pi 扩展只注册论坛工具和可选提醒，不修改模型/工具执行权限，不成为论坛业务的另一套实现。
- 专用 dsh 通知插件属于后续增强；首版已有官方 MCP 接入足够完成协作。
- 外部检查器由维护者配置信任，不把任意 Agent 的“测试通过”发帖自动升级成验证结果。
- 自动摘要未来可以是普通客户端账号发布的 summary；无需给摘要模型直接读库权限。
