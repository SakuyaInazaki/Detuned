# 开发规范

当前实现与验收只以[进度](progress.md)和[审查索引](reviews/README.md)为准；以下阶段事实保留当时范围，不作为后续dispatch或宿主认证升级。

## M7.1-B1历史接入事实（2026-10-10）

历史事实：M7.1-B1于2026-10-10有限接入十二HTTP/client操作，schema6保持；该包范围与原证据保留，后续当前状态只见进度和审查索引。

公开 run/receipt/snapshot/固定 post revision/required checks 使用白名单 DTO 和整对象绑定 guard；run 不公开持久审计字段 created_request_version。required checks 仅冻结名单中最新 run（最多32），缺 run 显式 null，无全 attempt 目录。snapshot 复用唯一 canonical JCS 实现，客户端对 UTF8 实际 WebCrypto SHA 校验 manifest_sha256。

普通 create/invalidate 支持既有显式或持久 logicalOperationId key；verify receipt/log 只支持显式或每调用 key，在读取文件、HTTP/getMe 前拒 logicalOperationId，不做普通身份发现。issuer 无 key、retryBudget0、一次明文；按当前空间 owner/maintainer 核心授权。既有 admin 虚拟 owner 仅在无 membership 且 allowed_space_ids 已允许空间时适用，已有低角色或 inactive membership 不被覆盖。

run-bound 附件使用精确编码 scoped URL，客户端只访问构造的同 origin 路径；沿用 bounded/hash/EOF/取消/迟到 body dispose/no-clobber 传输。check 路径包括错误早退均 private, no-store；不放宽 generic artifact、私有评审或 verify 的空间/getMe 权限。run 按因果版本判断，不要求墙钟单调；请求与响应均按 Unicode 码点验证 reason 上限500。


## M7.1-A后的实现纪律（2026-10-10）

M7.1-A当时内部checks/schema6维护有限接受；当时下一[B1](reviews/2026-10-09-m7-1-a/planning/m7-1b1-task.md)仅HTTP/sharedclient规划，必须本包metadata末核/封存、新fresh与root dispatch后写入。仍按sol6.1文件所有权与D单一串行运行窗；fixture必须用真实V5归档副本水合，历史DDL/profile独立冻结，不能制造formal成功行或放宽classifier迎合旧混版本fixture。精确失败/修复/相关补测保留，不称首full全绿。用户前端禁令、VM/模型/全局配置/发布禁令保持。

阶段历史状态见[进度](progress.md)：M7.1-A内部checks与schema6维护已有限接受，截至M7.1-A当时公开check HTTP/client仍待B1。以下C2A/C2B及宿主阶段记录保留当时事实，不升级原宿主认证。

## 1. 工作方法

每次开发以 Mx.y 和 FR/T 编号说明范围，先实现最小可运行路径，再补当前路径的必要错误和权限处理。不要因“以后可能”加入通用编排 DSL、事件总线框架或多数据库抽象。

改动前读取模块文档和现有代码；复用已存在实现。设计冲突先明确事实和影响，低风险可逆选择直接决策并记 ADR。任务完成须运行对应检查；不为纯文案或排版添加镜像单测。

## 2. 代码与依赖

- TypeScript strict；跨边界输入先解析验证，禁止用 `as` 绕过不可信数据检查。`any` 只在确有必要的第三方边界局部封装并说明。
- 领域字段统一 snake_case；本地 TS 函数变量可 camelCase；转换集中在边界，不在每层反复转换。
- ID、revision、hash、event cursor 使用区分类型，避免混用 actor/session/consumer。
- 业务代码不得读取 process.env；在组合根解析配置后显式注入。凭据、时钟、随机 ID、文件存储和事务便于替换测试实现。
- 异步外部请求必须有 timeout/AbortSignal；不吞异常。不要在后台留下未观察的 Promise。
- SQL 参数化；事务范围短且显式；写入返回值来自已提交状态。
- 单一依赖版本锁和单一协议源。Pi/dsh 的上游 SDK 不穿透到 core，不以它们的模型类型设计论坛数据。
- 新依赖必须说明用途、维护状况、许可和替代成本；没有实际需要不引入 ORM、队列、向量库或状态机引擎。

## 3. Schema、错误和兼容性

protocol 是类型/schema 的唯一来源；服务端校验、OpenAPI、CLI 输入、MCP/Pi 工具目录共享定义。适配器无法直接使用同一 schema 时，写明确转换与跨入口契约测试，不能手工复制后各自演化。

破坏性变化更新 API 主版本或提供明确迁移。可选响应字段可加；改变既有字段含义、排序/确认语义和错误码行为视为兼容性变更。每次修改同步文档、示例和契约 fixture。

错误用稳定 code、可读 message、retryable、非敏感 details；用户不能靠错误判断无权对象是否存在。内层异常到公共错误的转换集中，日志与响应分别处理。

## 4. 数据与安全硬约束

评审与权限不能只靠 prompt、UI 按钮或客户端守卫。时间、作者、权限、hash、修订号和正式结果由服务确认。前端传来的 actor_id、is_admin、approved、verified 一律不得直接信任。

业务状态、事件、幂等结果同事务。历史引用永远固定版本。附件 finalization 和配额竞争必须有测试。sealed review 在数据库查询、搜索、分页、事件、导出和缓存路径上均检查。

不记录或上传模型思维链；需要的研究理由以可复查摘要和证据保存。秘密使用文件/环境注入，提交前检查；禁止示例中包含真实 token。

## 5. 测试层次

审查档案 `docs/reviews/**` 与宿主专用 runtime 实验 `scripts/integrations/dsh-runtime/**` 使用其显式专用命令验收，默认核心 CI 不收集这些外部环境 spec；保留原默认排除项及核心测试入口。

单元测试覆盖真正的规则：状态转换、资格、材料 hash、cursor/ack、失败分类。集成测试使用真实临时 SQLite 和文件系统，验证事务/外键/FTS/重启；不要用全 mock 冒充存储可靠性。

契约测试比较 HTTP/CLI/MCP/Pi 的同一行为，宿主实测另记录版本。UI 只测关键旅程和内容隔离，不写大量脆弱截图测试。真实模型评估单独命令且默认不运行，费用先由用户授权。

项目必须提供脚本：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:integration`、`pnpm test:contracts`、`pnpm build`；UI 建立后增加 `pnpm test:e2e`。现有脚本的实际执行结果以进度文件和最新审查证据为准，脚本存在不等于对应验收通过。

CI 无需模型凭据；固定时钟/种子；并发测试用屏障；只允许合理有界重试，不用重跑掩盖 flaky。修复高风险缺陷先记录最小复现并增加相关回归。

历史兼容样本永久归档在 `tests/fixtures`，不得只依赖临时目录或会话凭据。样本无凭据/实例secret，记录可核的源版本、请求/结果hash、生成配方与必要外部依赖版本。普通回归从归档复制到新临时目录，运行时签发临时凭据/secret，并用独立新进程验证重启重放；普通回归不依赖旧tmp、旧token、Git对象、生成器或网络。显式用Git忽略检查确认归档未被忽略，不能只证明文件在当前机器存在。再生成是另行操作，可要求固定Git对象及已安装依赖，不能把该要求转嫁普通回归。

旧来源说明与历史失败/缺失记录保留；新的持久样本经独立验证闭合所需兼容场景后，以新证据作为当前回归依据，不再反复把失踪临时材料列为工作阻碍，也不把新来源冒称原capture字节恢复。

## 6. 目录与文件

根目录保留 README、AGENTS、工具配置和必要发布文件。长期资料进 docs，用户可复制内容进 templates，演示进 examples，宿主配置进 integrations。模型输出、日志、运行数据库与临时文件进忽略目录或临时目录，不能污染源代码。经脱密并附可核来源的历史兼容fixture是持久测试资产，允许精确Git忽略例外收集其归档DB；不得用通配例外放开运行数据库或秘密。

不要创建 `.codex`、`.claude`、`.pi` 等自动生效的项目配置来偷偷影响用户会话。本轮先交付 integrations 示例，由用户选择安装。不要重写历史归档。

## 7. 提交、PR 与交接

一次提交解决一个明确行为或必要依赖；标题说明改变了什么。PR 先写触发问题与新的行为，然后必要实现说明、验证、迁移与限制。不要记录冗长尝试史；重要失败设计进 ADR。

交接记录模板：

```text
任务：M3.1 / FR-08
完成行为：……
关键文件与契约变化：……
已运行检查及结果：……
未运行检查及原因：……
数据迁移/回滚办法：……
已知限制：……
下一步及依赖：……
```

不得把未测试标成通过，不得用生成的示例输出冒充实测日志。原生 adapter 只在锁定版本通过后标支持；迁移须带旧数据验证。对外推送、发布或部署按用户授权执行，不把完成本地代码等同于已获公开发布授权。

## 8. 评审检查顺序

先看需求和范围，再查身份与数据边界、事务/恢复、协议一致性、相关验收证据，最后看可读性。出现权限泄漏、丢事件、错误批准、旧版本偷换、重复副作用或伪造验证记录时阻止发布；格式争议不盖过这些问题。

## M5.3-A已取得的有限Linux证据

Linuxarm64固定digest冷构建/nativeSQLite/type/lint与核心组合699/105已验；首13夹具失败由tmpdir/实际Ajv依赖链窄修，三文件38/38补证，不能报最终一次full绿。宿主与Linux产物分离，不复制Darwin node_modules。GitHub手动workflow与完整compose CLI未执行，跨平台仍未认证；见[M5.3-A](reviews/2026-10-09-m5-3-a/README.md)。

## 本机有界串行执行（主代理2026-10-09决定）

workspace build/type/lint内部并发1；核心测试worker1、文件串行，真实竞态case仍使用受控自有子进程，不减少coverage或改timeout来过门禁。测试执行由独验单一窗口协调；合成tmp在必要证据与复跑配方归档后及时清退。此为本机执行约束，不表示资源根因全部解决；用户VM/Colima/常驻环境禁令始终保持，现有相关环境不操作。

## 用户2026-10-09范围纠偏

截至C2A的阶段记录（以下历史计数与当时待办保持）：按用户2026-10-09最新范围，不再开发前端或安排Web、视觉、浏览器专项；现有Web源码与已取得历史证据保留。后续聚焦服务端、HTTP、CLI、MCP及dsh/Pi/Codex/Claude接入、协作、正式评审与外部检查。C2B公开意见检索和M7 checks/receipts、D01完整演示与维护交付仍待，完整目标尚未完成。

原路线中Web及视觉/浏览器开发任务不再作为待办；保留其历史事实和现有实现。主代理继续拆解、分发、验收，代码阅读/实现/测试委派gpt-6.1-sol子Agent；每包先定文件所有权，独验单一串行窗口。禁止模型调用、全局配置改写、未授权推送发布、VM/Colima/Docker守护环境操作等既有边界保持。按当前新任务书衔接，不以历史M0–M7字面范围重新启动前端。

C2A当时的下一任务为[C2B有界公开意见文本检索](reviews/2026-10-09-m6-4-c2a/planning/m6-4-c2b-task.md)，只作Agent入口；schema5不变、不新增持久FTS。须先C2A整包封存、新fresh及root dispatch；之后M7外部检查/回执、D01与必要维护验收，不预填成功。

M7.1-A当时M7.1-A当时下一任务为[M7.1-B1 HTTP/sharedclient](reviews/2026-10-09-m7-1-a/planning/m7-1b1-task.md)，以顶部流程边界为准，不重新执行上述历史C2B待办。
