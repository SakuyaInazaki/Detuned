# 下一轮提示词：M0/M1-R4-B-GATE+C

以下正文可直接交给实现 Agent。

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮任务为 **M0/M1-R4-B-GATE+C：完成验收补项并收口请求/响应契约**。

R19 已独立确认：152/152 正式测试通过（12 文件，B 82 项、生成 5 项）；26 条既定命令真实执行，25 条 exit 0，仅 R4 因 U05/U06 exit 1；AA/AB 各 4/4。**主键来源策略与缺迁移块时写出不一致产物的功能问题已关闭。** 当前只需补 B 的正式回归与说明，然后推进既有 R4-C。

**本提示词明确更新此前“完成 B 补项后必须单独交回、暂不进入 C”的安排：先完成单元 A 的门槛，达到后在同一实现回合继续单元 B（R4-C），最终一起交回复核。** A 未达标不得跳过；通过后无需再等待一轮单独审查。这里是下一步工作授权与自验门槛，不是提前宣称 R4-B/C 已获独立验收。不开始 M2。

## 0. 先读、范围与保护

先读 `AGENTS.md`、根 `README.md`、`docs/00-implementation-brief.md`、`docs/08-roadmap.md`、`docs/11-development-standards.md`；再读本目录的 `README.md`、`coverage-audit.md`、`verification.md`、`commands.json`、`harness-notes.md`，以及：

- `docs/03-data-model.md`、`docs/04-protocol.md`、`docs/07-security-operations.md` 和相关 `docs/12-decisions.md`。
- `docs/reviews/2026-09-28-m0-m1-r4/follow-up-contracts.md`：C01–C03 原任务书，实施顺序以本提示词为准。
- `integrations/README.md` 及 Pi/dsh 对应说明、锁定依赖中的官方声明。

开工先报告任务编号、A/B 两个单元的行为目标、文件范围和验收方式。HEAD 仍为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，工作区有多轮未提交变更。以本目录 baseline 的 **90 个产品/测试/构建文件**为基准，保存 before/after，额外纳入本轮新增文件；文档变化另列。不要把 HEAD 到当前的所有差异冒认为本轮改动。

保护约束：

- 不 reset/clean/checkout 覆盖工作，不擅自提交、推送、发布或部署。
- 禁止使用、安装或间接运行 deepseek-brainstorm；不启动其他 Agent，不调用模型，不改全局 harness 配置。
- 不改历史探针、旧 observed、旧报告或其指纹；不从摘要重建已丢失的日志。新记录进入本轮新归档目录。
- `archive/pre-plan.original.md`、`tests/fixtures/historical-v1-schema.sql` 保留原字节。故障实验只在自己创建的临时副本/数据库中进行。
- 单元 A 原则上只改正式生成测试/helper 和说明。单元 B 允许改 protocol、server 路由、必要 core 校验、client、CLI/MCP/Pi 适配、相应测试/契约/版本声明；不改真实数据库布局、加 schema 版本或重写历史幂等重建。

## 1. 单元 A：B 包验收补项

### A1. 修复 no-op 测试并完成有限矩阵

`packages/storage-sqlite/tests/schema-generation.test.ts` 的索引用例替换了不存在的 `idx_posts_thread_created`，原文目标出现 0 次；实际命名索引为 `idx_events_space_seq ON events(space_id, seq)`。先保存证明该替换不发生的证据，再修测试。生产索引来源行为已经由 AA02 独立确认，不能把测试缺口写成新生产故障。

按本目录 `coverage-audit.md` 补齐：

1. 真实命名索引与 FTS 来源变体；每次变异先断言匹配目标存在、匹配次数符合预期、变异结果不同，再验证生成字段及运行时效果。不能只有 generate/check 退出码。
2. 健康输入和允许 NOT NULL 变化：V2 对应属性跟随，V1 仍来自冻结历史源且不变；编译后移除 src 仍正常。
3. PK NOCASE/DESC 两例保持拒绝，诊断指向策略；不要求支持这两种新布局。
4. V1、V2 profile 分别故意改坏：真实 check 失败，generate 修复后 check 成功；证明确实改坏/修复，历史 SQL 不改。
5. 缺驱动、历史源、当前源、helper、V2 标识及 BEGIN/END MIGRATION_DDL：按 check/generate 各自责任失败；生成目标字节哈希不变；恢复输入后同一命令恢复成功。迁移标记变体使用 AB02 已有的“同时改变源 SQL”条件，避免因产物本来就没变化而假通过。

允许参数化合并，不限定测试数量。正式测试调用产品脚本，不导入 `docs/reviews/` 作为实现；不重新复制提取器。子进程的失败必须是预期非零退出及对应诊断，不能让超时、signal 或 null 状态冒充成功拒绝。继续使用现有完整临时项目夹具与已安装依赖。

不要扩展到通用 SQL AST、额外 SQL 语法兼容性、磁盘断电写入或新的数据库后端；不要重复开发已通过的 B01/B03、初始化、历史结果和 FTS detail 修复。如果该有限矩阵确实发现同一任务的行为回归，保存最小反例并做最小修复，否则保持生成器/运行时代码不动。

### A2. 在新报告中勘误，不改历史

依据 R19 README 和 `delivery-evidence-audit.json`，逐项更正：

- U05 = 非法关系枚举被接受并写状态；U06 = 截断 HTTP 200 JSON 被当作成功返回 undefined。
- 原/现 R17 文件哈希完整引用 R19 中的真实值；原日志未恢复。脚本只输出 stdout，覆盖调用者无法从现存材料确定。
- 第 18 条脚本目录为 `2026-09-29-m0-m1-r10`。
- 使用真实测试名、实际诊断和实现逻辑；已保证的是输入/模板/写前失败时不部分生成，不能写“任何异常都不会改文件”。

同步当前 docs/03、07、ADR 中相应措辞，只声明有限测试实际验证的范围。已有固定主键策略保持，无需新增 ADR 体系或再次设计架构。

### A 出口：满足后立即继续单元 B

保存 A 完成时的源码指纹与正式测试结果，并执行本目录 `commands.json` 的 26 条命令：

- build/typecheck/lint/正式套件成功，新增或修正用例被默认 `pnpm test:all` 收集；实际数量从输出读取。
- AA/AB 各 4/4，所有既有已通过行为不回归。
- **此时**仅允许 R4 命令 exit 1，且解析原始结果确认失败集合恰好是 U05/U06，其他命令 exit 0。
- 保存完整日志；测试与报告补项逐一有对应证据。

A 不达标先完成 A；达标就继续 C。A 的自验不写成新的独立审查结论。

## 2. 单元 B / R4-C：请求、响应与接入契约

### C01. 关闭 R4-F05/U05，补齐已启用路由验证

当前 U05 仍返回 201，写入非法 `not_a_relation_type`，并新增 relation/event/idempotency 各 1 行。先把它变成正式失败回归，再修根因。

1. 清点 `packages/server/src/routes/` 实际注册的 meta/spaces/threads/posts/relations/events/search/admin 路由。为每个已有入口列 body/query/params/业务 header 的 schema 来源、有效输入和拒绝条件；无该参数的入口标“不适用”。仅覆盖已启用能力，不补空的 M2–M7 路由。
2. 公共 schema 落在 protocol，HTTP 按实际契约使用。非法 enum、类型、未知业务字段、无效修订与引用按语义返回稳定 4xx，不能进入成功写事务或被静默丢弃。body 不依赖全局强制类型转换把坏输入改成有效值。
3. core 继续独立判断枚举/状态迁移、权限、空间归属与幂等不变量。补 relation 创建的枚举防线，使绕过 HTTP 的 core 调用也不能写入非法关系。传输格式校验不复制到各 adapter，业务规则不只放在 Fastify schema。
4. query 数字需明确整数语法、范围、重复参数行为，避免 `parseInt('1bad')` 变成合法 1；不要为尚未实现的分页、预算参数扩展产品功能。
5. 只验证业务相关 header，不拒绝正常 Host/Accept/User-Agent 等标准头。保持 API 版本和 Idempotency-Key 约定。工具 `request_key` 映射为 HTTP 头，不能混入禁止额外字段的业务 body。
6. 同步当前 protocol、HTTP、OpenAPI、已有工具映射。规划接口继续明确标为规划；poll/ack/deactivate 等按现行契约处理，不为了表格一致而凭空扩展幂等操作族。

验收：合法 relation create→resolve→reopen 正常，非法枚举和其他非法业务输入返回指定 4xx；比较请求前后业务状态、事件及幂等记录，拒绝路径无新增状态。每类有效校验都有至少一个可用正例，不能靠“全部拒绝”使测试通过。已有 CLI/MCP/Pi 正常调用保持一致。

### C02. 关闭 R4-F06/U06，完成响应与取消生命周期

主要入口为 `packages/client/src/client.ts`。当前读取 JSON 的异常被吞，HTTP 200 截断正文会 resolved undefined；现有取消分类及退避监听器清理也须按原 C02 收尾。

**响应与错误：**

- 200/201 等成功状态的损坏 JSON、截断正文、不合法成功 envelope 必须 reject。成功 envelope 按 docs/04 有 api_version/request_id/data；按具体操作允许的 data 验证，区分缺失 `data` 与合法的 null/false/0/空数组等值，不用简单 truthiness 判断。
- 客户端仍忽略未知响应属性以保持向前兼容；不要直接套用会拒绝未知属性的闭合请求 schema。空 body 只在实际端点契约允许时接受，不新增没有契约依据的 204 特例。
- 服务端业务错误继续保留 DetunedError 的 code/status/retryable 等信息。用户取消、超时、传输失败、响应解析/契约失败能被调用方稳定区分；不用错误 message 是否包含 aborted 猜测分类。优先最小公共客户端错误表示，不引入无必要的服务端错误码或依赖。
- CLI 对失败非零退出；MCP 返回 SDK 规定的工具错误；Pi 注册工具的 execute 抛错。不得 resolved undefined 或输出成功文案。

**取消、超时与重试：**

- 保留已经通过的 Pi→wrapper→request→fetch signal 传递。
- 请求前、等待响应头、消费 body、重试退避期间的外部取消都及时中止后续工作，取消后不重试、不新增请求；客户端取消不能宣称已回滚服务端提交。
- 请求超时与用户取消分别可识别；定义 timeout 的作用范围并记录在契约。定时器与 abort listener 在成功、失败、取消、body 完成和正常退避完成后清理，不让上一轮 timeout 误伤下一轮或在每次正常退避遗留监听器。
- 网络失败、429/503 的重试按 docs/04 有界、退避、处理 Retry-After；明确“最多 3 次”的计数口径并使实现/测试/文档一致。不可重试业务错误、解析/契约失败和用户取消不盲目重试。每次写重试都保留最初 request_key，不生成新键。

**正式测试：**

| 场景 | 必须断言 |
|---|---|
| 完整成功与含未知响应字段 | 正常解析；不把允许的 falsy data 当缺失 |
| U06 截断 JSON / 错误成功 envelope | 直接 client reject；至少一个真实注册的 adapter 工具调用也失败；相关 CLI/MCP/Pi 映射有证据 |
| 预先取消、等待头时取消、读 body 时取消 | 稳定取消类别，及时结束，取消后请求计数不增长 |
| 退避期间取消 | 不发起下一次请求，清理等待资源 |
| 正常退避结束、重试成功/耗尽 | 有界次数、原键稳定、timer/listener 不泄漏 |
| 用户取消与超时 | 类型或判别字段不同；业务 DetunedError 不被误包装成取消 |

使用可控 fetch、阶段屏障、可验证时钟或本地回环 HTTP，避免依赖不稳定长 sleep。至少通过注册回调或 MCP stdio server 测一次实际适配器边界，不能所有 adapter 测试都直接调用 DetunedClient。已有真实 HTTP/CLI/MCP 的测试基础可复用；不调用模型。

### C03. Pi 类型、无 UI 行为与版本声明

按本目录 `harness-notes.md` 重新核对本机锁定的官方 Pi 声明及 integrations 中的一手来源。当前 Pi **0.87.1**，最低 Node **22.19.0**，本机已运行 **26.3.0**。在线 latest 文档可能已更新，不把 latest 新 API 用于旧版本。

- 保持官方 ToolDefinition 的 execute 参数、返回 content/details 和抛错方式；说明协议 JSON schema 转为 Pi 参数类型的局部边界，缩小 `any`，不进行全仓库类型重构。
- `/forum-status`、`/forum-check` 各有有 UI/无 UI 的受控测试。使用锁定版本实际支持的上下文；无 UI 时提供明确、可观察且适合该模式的结果或限制，不能 optional chaining 静默吞掉唯一输出再宣称成功。不要滥用给模型注入消息来代替命令输出。
- 根 engines、适配器要求、CI 版本、packageManager 与文档保持一致。核对 pnpm 和其他已锁定依赖的真实最低要求，再确定声明；不能仅把所有 `22` 文本机械替换。
- 继续原生 Pi 适配器与共享 HTTP 客户端路线；dsh 使用现有 MCP 接入。dsh 官方说明仅作为能力/错误边界依据，受控 MCP 测试不冒充真实宿主测试。
- `integrations/compatibility.json` 准确区分编译、受控测试、真实宿主端到端。没运行的 dsh/Pi/Codex/Claude Code 项保持 `not_tested`。不自动升级 SDK、安装宿主或修改全局配置。

## 3. 最终验收与交付

最终源码稳定后构建，再完整执行本目录 `commands.json` 的 **26 条既定命令**。C 完成后预期与 A 阶段不同：**26 条全部 exit 0，R4 U01–U08 为 8/8**；U05/U06 不再允许豁免。新增的正式测试由默认套件执行，数量以真实输出为准。

旧 R15 `check-ddl-build.mjs` 因其不完整夹具仍不列为门槛，不能修改历史脚本或恢复静默跳过来迁就它。保留所有既有权限、撤权、脱敏、幂等、重放、迁移、结构及适配层通过结果。

运行 CI 中适用的本地检查；依赖安装按锁文件和冻结模式进行。没有实际运行的干净安装、Node 22 指定环境、远程 CI、宿主认证或真实研究评估明确写“未运行”，并说明环境原因，不能从本机 Node 26 结果推断均通过。

新归档建议目录：`docs/reviews/2026-10-02-m0-m1-r19/implementation-r4-b-gate-c/`，包含：

1. README：A/B 各做了什么，R19-F01/E01 与 R4-F05/F06 逐项结果，实际限制。
2. before/after 指纹：基线 90 文件、本轮新增文件、旧脚本与历史材料；文档变化单列。
3. A 门槛快照及结果、C 完成后最终结果分目录保存，不能覆盖前者。
4. 命令清单：实际命令、cwd、开始/结束时间、真实退出码、完整 stdout/stderr 文件。以 JSON 内容校验 A 的例外集合；C 不接受任何预期失败。
5. 已启用路由验证表、正式用例与验收条件对应表、取消阶段证据、Pi 锁定类型/受控行为证据及未运行清单。
6. B 报告勘误，原始覆盖事实及真实哈希；R19 独立输出保持不变。

同步 docs/03、04、07、必要 ADR/OpenAPI/接入文档与三个活动状态入口，限实际变化。根 README、docs/progress.md、审查索引的**最新独立结论仍为 R19**；只补“B-GATE+C 已实现/自验结果，待独立复核”，不能自封 R20 或已独立验收。

完成后提供 M2.1 就绪评估：哪些前置条件已自验、哪些等待独立复核、哪些真实宿主检查未运行。**交回本轮 A+C 成果并停止，不开始附件、Web、评审模块或自动调度。**
