# Detuned 实施进度追踪

更新时间：2026-10-02
状态遵循 [实施路线 (docs/08-roadmap.md)](08-roadmap.md) 与 [开发规范 (docs/11-development-standards.md)](11-development-standards.md)。

**最新独立结论：[R21 独立复核完成](reviews/2026-10-02-m0-m1-r21/README.md)。** 169/169 正式测试（13 文件，B 82 项、生成 6 项、C 16 项）、继承 27 条命令及 AC 6/6 全部通过，R20-F02 成功信封修复关闭。B 功能与正式回归维持验收通过；当前请求/OpenAPI 契约、错误来源分类、重试生命周期三组既定要求仍有遗漏，AD 0/5。下一轮 [R4-C.2](reviews/2026-10-02-m0-m1-r21/next-agent-prompt.md) 完成这三组及正式覆盖/文档，不重做 B。M0/M1 整体验收尚未通过，M2 不开始。

## 阶段概览

| 阶段 | 范围 | 状态 | 关键交付物 / 验收记录 |
|---|---|---|---|
| **M0** | 契约与版本冻结 | 基线已实现，契约验收未完成 | U05/U06、成功信封修复已关闭；R21 请求/OpenAPI 与客户端遗漏待 C.2 完成 |
| **M1** | 身份与讨论闭环 | 数据包验收通过，契约收尾中 | 169 项正式测试、继承 27 条命令及 AC 通过；B 关闭，AD 仍复现三组遗漏 |
| **M0-R / M1-R** | 首轮实现修复与重新验收 | 已完成 | 修复审查缺陷 F01–F12；`check-behavior.mjs` 15/15 通过，`check-adapters.mjs` 5/5 通过；全套自动化测试 36/36 全绿；未进入 M2 |
| **M0-R2 / M1-R2** | 第二轮根因修复与验收收口 | 已完成 | 解决 R2-F01–R2-F09 六项 P1 与三项 P2；`check-remaining.mjs` 12/12 通过，`check-cli.mjs` 3/3 通过；9 个测试套件 51/51 项全部通过；未进入 M2 |
| **M0-R3 / M1-R3** | **第三轮架构闭环与不变量收口** | 部分通过 | T01–T11 全通、62 项正式测试通过属实；R3-A 关键修复已验证，R3-B/R3-C 仍有 R4 复现缺陷 |
| **M0/M1-R4 复核** | 数据/升级与契约核对 | 历史审查记录 | 原基线 6 项失败、2 项通过；后续实现复核见 R5；[原始证据](reviews/2026-09-28-m0-m1-r4/verification.md) 保留 |
| **M0/M1-R4-B** | 数据与升级可靠性 | 功能与正式回归验收通过 | R20 确认 R19-F01 补齐，生成 6 项、B 82 项及所有旧 B 探针通过；交付文档勘误随 C 收尾，不重启 B 开发 |
| **M0/M1-R4-B.1** | 修完数据与升级可靠性包 | 历史声明 | 75 项测试与 G01–G09 通过；五类剩余缺陷交由 R4-B.2 关闭 |
| **M0/M1-R4-B.2** | 完成历史结果与升级边界 | 历史声明 | H01–H10 和 84 项测试通过；剩余反例收口至 R4-B.3 |
| **M0/M1-R4-B.3** | 历史结果、实例分类与引用完整性收口 | 历史声明 | J01–J07、K01 及 91 项测试通过属实；R8 补查发现回归和剩余缺口；[原交付报告](reviews/2026-09-29-m0-m1-r7/implementation-r4-b3/README.md) 保留 |
| **M0/M1-R4-B.4-1** | 恢复空间创建重试与重复启动 | 目标功能与快照补项已核验 | R8-F01/F02 关闭；N01–N05 无回归；R12 确认 L02-3c 全库重开快照及 operation 隔离已补齐 |
| **M0/M1-R4-B.4-2** | 历史结果与引用校验 | 已确认指定行为修复 | L04–L07、P/Q/V/W/X 全通；R15 确认最后的未来版本拒绝与 V 正式入口补项已完成，数据包其他要求继续收尾 |
| **M0/M1-R4-B.4-2R** | 统一验证入口与历史结果保真 | 历史审查记录 | 当时 112 项及 P 全通、Q01–Q04 失败；R12 确认原 Q 已通过，根因其他入口继续收尾 |
| **M0/M1-R4-B.4-2R2** | 先验证原输入，准确恢复历史时间 | 历史审查记录 | 117 项与 Q 全通；L02-3c 补齐；V01–V04 仍失败、V05 通过；[R12 结论](reviews/2026-09-30-m0-m1-r12/README.md)，原 [自报归档](reviews/2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/README.md) 保留 |
| **M0/M1-R4-B.4-2R3** | 完成降级前校验与显式时间冲突检查 | 历史交付，已复核 | 122 项及 V 全通；R12-F02 关闭；W01–W03 遗漏由 B.4-2R4 完成，见 [R13](reviews/2026-09-30-m0-m1-r13/README.md)；原 [自报](reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/README.md) 保留 |
| **M0/M1-R4-B.4-2R4** | 统一旧初始帖字段解析，保持初始帖重放形状 | 指定修复已复核，后续补项已核验 | W01–W03 已通过；R14 登记的 X03 及 V01/V02 正式入口补项在 R15 关闭；[R14 历史结论](reviews/2026-10-01-m0-m1-r14/README.md) 保留 |
| **M0/M1-R4-B.4-3** | R14 前置补项、结构预检与原 B 证据 | 部分通过 | 单元 A、L03 原反例、SQL→常量生成有效；Y01–Y03 和迁移 DDL/原 B 证据未完成；[R15 结论](reviews/2026-10-02-m0-m1-r15/README.md)，[原交付](reviews/2026-10-01-m0-m1-r14/implementation-r4-b4-3/README.md) 保留 |
| **M0/M1-R4-B.4-3R** | 结构判定、迁移 DDL 复用与真实验收证据 | 已实现，R16 部分通过 | 初始化/版本事实修复、迁移 DDL 复用、11 族重放及指定重开补项已核验；结构语义/来源与少量证据仍待收尾 |
| **M0/M1-R4-B.4-3R2** | 索引与 FTS 语义、固定结构来源、剩余证据 | 已实现，R17 部分通过 | 原索引、B01/B03 行为补项关闭；Z 全通，FTS 配置/来源与交付文字仍需收尾 |
| **M0/M1-R4-B.4-3R3** | FTS 配置比较与结构生成验收 | 已实现，R18 部分通过 | R17-F01 关闭，AA 全通；F02 两处生成遗漏及正式回归/证据保存待补 |
| **M0/M1-R4-B.4-3R4** | 主键来源约束与生成失败原子性 | 功能修复通过，测试与说明待补 | 152 项、AA/AB 全通；生成测试的索引替换未生效，有限矩阵需补；26 条中仅 R4/U05、U06 失败 |
| **M0/M1-R4-B-GATE+C** | B 验收补项与请求/响应契约 | 已实现，R20 部分验收 | A 功能/正式回归通过，U05/U06 关闭；C 新 AC01～AC04 失败，AC05/AC06 正例通过 |
| **M0/M1-R4-C.1** | 请求边界、响应错误与重试契约 | 已实现，R21 部分验收 | 169 项、27 命令与 AC 6/6 全通；成功信封通过；AD 的当前写入口/OpenAPI、分类、退避遗漏待 C.2 |
| **M0/M1-R4-C.2** | 请求契约统一、错误分类与重试生命周期 | 下一轮任务 | [提示词](reviews/2026-10-02-m0-m1-r21/next-agent-prompt.md)：关闭 R21-F01～F03，同步正式覆盖和证据，不扩展 B/M2 |
| **M0/M1-R5 复核** | R4-B 实现与验收声明核对 | 历史审查，具体探针已通过 | G01–G09 已修复；完整不变量的后续复核见 R6 |
| **M0/M1-R6 复核** | R4-B.1 交付复核 | 历史审查记录 | [H01–H10 审查脚本](reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs) 已在 R4-B.2 达到 10/10 全绿 |
| **M0/M1-R7 复核** | R4-B.2 交付与证据核对 | 历史审查记录 | [审查报告](reviews/2026-09-29-m0-m1-r7/README.md)；J/K 具体输入在 B.3 通过，完整条件由 R8 继续限定 |
| **M0/M1-R8 复核** | R4-B.3 行为及验收声明核对 | 历史审查记录 | [审查报告](reviews/2026-09-29-m0-m1-r8/README.md)；L01/L02/L04–L08 通过，L03 归后续 B.4-3 |
| **M0/M1-R9 复核** | R4-B.4-1 交付核对及补验 | 历史审查记录 | [审查报告](reviews/2026-09-29-m0-m1-r9/README.md)；两个功能修复通过，N01–N05 全绿 |
| **M0/M1-R10 复核** | R4-B.4-2 行为与覆盖核对 | 历史审查，具体 P 探针已通过 | [审查报告](reviews/2026-09-29-m0-m1-r10/README.md)；R11 确认 F02/F04 根因仍有遗漏 |
| **M0/M1-R11 复核** | R4-B.4-2R 修复与证据核对 | 历史审查记录 | [审查报告](reviews/2026-09-30-m0-m1-r11/README.md)；其具体 Q 反例及 L02-3c 补项已通过，剩余入口见 R12 |
| **M0/M1-R12 复核** | R4-B.4-2R2 行为与交付证据核对 | 历史审查记录 | [审查报告](reviews/2026-09-30-m0-m1-r12/README.md)；原 V01–V05 在 R13 全通，旧输入其他分支继续收尾 |
| **M0/M1-R13 复核** | R4-B.4-2R3 行为与交付证据核对 | 历史审查记录 | [审查报告](reviews/2026-09-30-m0-m1-r13/README.md)；当时 122 项与 V 全通、W 未通过；R14 确认 W 指定修复有效 |
| **M0/M1-R14 复核** | R4-B.4-2R4 行为与交付证据核对 | 历史审查记录 | [审查报告](reviews/2026-10-01-m0-m1-r14/README.md)；当时 125 项与 W 全通、X03 未通过；X03 与 V 正式入口补项在 R15 关闭 |
| **M0/M1-R15 复核** | R4-B.4-3 行为与验收证据核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r15/README.md)；当时 136 项、Y01–Y03 失败；原 Y 反例在 R16 全通，其余语义/证据继续收尾 |
| **M0/M1-R16 复核** | R4-B.4-3R 行为与验收证据核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r16/README.md)；当时 140 项、Z01/Z02 失败；Z 在 R17 全通，来源要求继续收尾 |
| **M0/M1-R17 复核** | R4-B.4-3R2 行为与验收证据核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r17/README.md)；当时 146 项、AA01–AA03 失败；AA 在 R18 全通；一份观测覆盖事实见 R18 |
| **M0/M1-R18 复核** | R4-B.4-3R3 生成可靠性与证据核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r18/README.md)；当时 147 项及 AA 全通，AB 2/4；原 AB 功能问题在 R19 关闭 |
| **M0/M1-R19 复核** | R4-B.4-3R4 功能、正式覆盖与交付核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r19/README.md)；当时 152 项与 AA/AB 全通，有限正式测试补项在 R20 确认完成 |
| **M0/M1-R20 复核** | B-GATE+C 实现与完整契约核对 | 历史审查记录 | [审查报告](reviews/2026-10-02-m0-m1-r20/README.md)；当时 166 项、原 26 命令通过；B 关闭，AC 的具体输入在 R21 通过 |
| **M0/M1-R21 复核** | C.1 完整要求与证据核对 | 当前独立结论 | [审查报告](reviews/2026-10-02-m0-m1-r21/README.md)；169 项、27 命令和 AC 全通；AD 0/5，归三组既定遗漏 |
| **M2** | 证据与可检索记忆 | 待开始，前置验收未通过 | R4-B/C 均验收后再评估 M2.1；附件、失败记忆和上下文预算按原路线实施，**无向量检索任务** |
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

---

## M0/M1-R4-B：数据与升级可靠性交付记录 (2026-09-28)

> 以下保留实现方当时的交付声明。后续独立复核确认 U01–U04 的具体输入已通过，但完整包尚未完成；其“所有不变量已关闭”等表述以 [R5 审查](reviews/2026-09-28-m0-m1-r5/README.md) 和 [覆盖核对](reviews/2026-09-28-m0-m1-r5/coverage-audit.md) 为准。

### 1. 核心改进与数据不变量实现
- **严格有版本的幂等引用与历史快照**:
  - `IdempotencyService` 移除所有任意 JSON fallback 与全量业务对象缓存；所有写操作与 `IdempotencyResultRef` tagged union 显式绑定（版本 `v: 1`）。
  - 新增不可变历史实体表 `thread_versions (thread_id, version, title, state, created_at)`，线程创建与修改同步持久化快照，重放时不依赖可变当前标题，彻底杜绝历史版本漂移。
  - `relation.resolve` / `reopen` 历史引用绑定真实的 `RelationResolution` 记录，重放时保持操作发生时的不可变 `version` 与 `action`（关闭 U02）。
  - 未知 kind/version、损坏 JSON 或缺失修订返回结构化 422 `RESYNC_REQUIRED` 或 404，绝不重新执行业务 action（关闭 U04）。
- **初始化事实与凭据边界清晰区分**:
  - `isDatabaseInitialized` 严格依据 `instance_metadata.initialized === 'true'`。凭据全部吊销、过期或 actor 禁用后，实例生命周期事实不变，普通 `init` 绝不增发新 admin token、不创建新凭据、不重置 token secret（关闭 U03）。
  - `getInstanceSecret` 缺失时抛出明确异常，移除生成随机临时 secret 的生产 fallback。
- **有序、原子、可验证的 Schema v2 迁移**:
  - `CURRENT_SCHEMA_VERSION = 2`。DDL/DML 执行前实施版本预检，高于支持版本的未来数据库（如 v999）在监听和执行任何 DDL 前直接拒绝（保持 T07/T11）。
  - 所有迁移操作与幂等引用转换均在单一 `db.transaction(...)` 中运行；SQLite 写入故障或触发器中止异常直接向上传播，触发完整事务回滚，确保迁移要么全成要么全回滚（关闭 U01）。
  - `openAndCoordinateDatabase` 作为 CLI `init` 与 `serve` 统一的入口协调逻辑。

### 2. 验收证据与测试状态
- **R4-B 专属自动化回归测试 (`tests/integration/m0-m1-r4-b-regression.test.ts`)**:
  - **12/12 (B01–B12) 全部通过**
- **全量测试套件 (`pnpm test:all`)**:
  - **11 个测试文件，74 个测试全部通过 (0 失败)**
- **前轮审查探针全量回归复测**:
  - `check-behavior.mjs`: **15/15 全部通过**
  - `check-adapters.mjs`: **5/5 全部通过**
  - `check-remaining.mjs`: **12/12 全部通过**
  - `check-cli.mjs`: **3/3 全部通过**
  - `check-invariants.mjs`: **10/10 全部通过**
  - `check-serve-version.mjs`: **1/1 全部通过**
- **R4 未完成契约探针 (`check-unfinished-contracts.mjs`)**:
  - **U01–U04, U07, U08 通过 (6/8)**
  - **U05, U06 预期失败 (2/8)**：确认为后续 [R4-C](reviews/2026-09-28-m0-m1-r4/follow-up-contracts.md) 待解决事项，未在本轮隐瞒或放宽断言，因此脚本退出码为 1。
- **M2.1 就绪状态**: **尚未就绪**（需待 R4-C 修复 U05 关系校验与 U06 截断流处理后方可进入）。

---

## M0/M1-R4-B.2：完成历史结果与升级边界交付记录 (2026-09-28)

> 以下保留实现方的原交付声明。R7 已确认所列测试数量与 G/H 通过结果，但未接受“数据包全部完成”的结论；剩余四类问题、旧 T06 夹具修正与证据缺口见 [R7 审查](reviews/2026-09-29-m0-m1-r7/README.md)。

详见 [R4-B.2 交付记录](reviews/2026-09-28-m0-m1-r6/implementation-r4-b2/README.md)。

### 1. 核心改进与根因修复
- **历史操作结果与时间戳严格固定 (R6-F01 / H01, H02)**:
  - 历史 `relation.create` 迁移直接固定为原操作版本 (version = 1) 与状态 (`challenges` 为 `open`)，不再从可变 `relations` 当前行中提取状态。
  - `reconstructResult` 重建 thread 对象时从 `thread_versions` 提取历史 `created_at` 赋予 `updated_at`，杜绝重放时时间戳漂移；发帖重放中的嵌套关联对象版本与状态也严格锁定为创建时历史值。
- **当前实例材料损坏严格拒绝 (R6-F02 / H03, H04)**:
  - `classifyDatabase` 补齐 v2 结构检查（包含 `post_revisions`、`thread_versions` 等必需表）；缺失迁移版本标记（如仅有 version 2 无 1）判定为 `corrupt`。
  - `openAndCoordinateDatabase` 在 `serve` 模式下，若数据库缺少 `instance_metadata` 但包含 `thread_versions` 或版本大于等于 2，在启动监听或生成任何 secret 前直接抛出 403 `FORBIDDEN`，杜绝静默重生成 secret。
- **迁移输出统一校验与冲突阻断 (R6-F03 / H05, H08)**:
  - `migrateSingleRef` 增加前置版本守卫（`v !== undefined && v !== 1` 立即抛出异常）；所有迁移转换生成的引用在返回前必须通过 `validateResultRef(operation, ref)` 检验。
  - 历史主题版本检测：若 `thread_versions` 存在同 ID 和版本的记录但标题冲突，立即抛出历史冲突异常，中止并回滚整笔数据库升级。
- **引用格式与重放严格校验 (R6-F04 / H06, H07)**:
  - `parseOperation` 严格匹配 11 种操作注册表，拒绝未知或前缀相似操作；`hasForbiddenContent` 递归扫描禁止字段；`validateResultRef` 施加白名单。
  - `reconstructResult` 校验操作目标 ID 与 URL 一致性；关联关系丢失时显式返回 422 `RESYNC_REQUIRED`，不再静默丢弃。
- **脱敏错误诊断 (R6-F05 / H09)**:
  - 移除所有错误消息中的原始正文插值，CLI 输出仅包含受控操作名和 key。

### 2. 验收证据与测试状态
- **本轮 R6 审查探针 (`docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs`)**:
  - **10/10 (H01–H10) 全部通过 (0 失败)**
- **R5 审查探针 (`docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs`)**:
  - **9/9 (G01–G09) 全部通过 (0 失败)**
- **R4 审查探针 (`docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs`)**:
  - **6/8 通过** (U01–U04, U07, U08 通过；U05, U06 预期失败并留待 R4-C)
- **历史探针回归 (R1–R3 46 项)**: **全部通过 (0 失败)**
- **全量自动化测试套件 (`pnpm test`)**: **11 个测试文件，84 项测试全部通过 (0 失败)**
- **B01–B12 证据矩阵**: 完整覆盖 12 项数据与升级可靠性不变量，详见 [实施报告](reviews/2026-09-28-m0-m1-r6/implementation-r4-b2/README.md#3-b01b12-断言证据矩阵)。
- **M2.1 就绪状态**: **尚未就绪**（需待后续 R4-C 修复 U05 关系校验与 U06 截断流处理后方可进入）。

---

## M0/M1-R4-B.3：完成历史结果重建、实例分类与引用完整性收口交付记录 (2026-09-29)

> 以下保留实现方原声明。R8 已确认 91 项测试和 G/H/J/K 通过，但未接受“整个数据包完成”的结论；五类问题、证据缺口及下一轮小包见 [R8 审查](reviews/2026-09-29-m0-m1-r8/README.md)。

详见 [R4-B.3 交付报告](reviews/2026-09-29-m0-m1-r7/implementation-r4-b3/README.md)。

### 1. 核心改进与根因修复
- **历史旧格式复用关系安全降级与重建 (R7-F01 / J01)**:
  - 针对缺乏 `relation_version` 和 `relation_state` 的旧版引用，迁移器安全转换为 `{ v: 1, kind: 'unreplayable', op: 'relation.create', reason: 'historical_relation_version_unrecoverable' }`。
  - 重放不可重建历史记录时严格抛出 422 `RESYNC_REQUIRED`，杜绝将当前关系状态错误套用为历史结果。
- **实例分类与损坏库统一拒绝 (R7-F02 / J02, J03)**:
  - `classifyDatabase` 对表列结构实施强校验（`REQUIRED_SCHEMA_COLUMNS`，使用 `PRAGMA table_info` 检查列存在性）；当前库缺失必需列或元数据直接判定为 `corrupt`。
  - `bootstrapDatabase`、CLI `init` 与 `serve` 统一拦截 `corrupt` 库并以 403 `FORBIDDEN` 退出，绝不执行 DDL 变更，绝不重写 `token_secret` 或增发凭据。
- **历史时间戳保真与冲突检测 (R7-F03 / J04, J05)**:
  - 历史主题更新迁移完整保留 `updated_at` 时间戳快照。
  - 迁移与重放过程中强制执行空间与实体引用强绑定（`space_id` 归属与 resolution-relation 一致性），冲突状态立即中止迁移并回滚。
- **引用编码与字段白名单严格约束 (R7-F04 / J06, J07)**:
  - 整数采用安全整数（`Number.isSafeInteger`）校验，杜绝浮点数与非安全大数；引用对象只允许白名单字段。
  - 规范注册 `unreplayable` 操作原因，严格封堵编码器与迁移器中的非法字段。

### 2. 验收证据与测试状态
- **本轮 R7 审查探针 (`docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs`)**:
  - **7/7 (J01–J07) 全部通过 (0 失败)**
- **真实旧 DDL 探针 (`docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs`)**:
  - **1/1 (K01) 通过**（基于 SHA256 为 `a68b02a5...` 的真实 `fa1b35c` DDL 验证平滑升级）
- **R6 审查探针 (`docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs`)**: **10/10 全部通过**
- **R5 审查探针 (`docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs`)**: **9/9 全部通过**
- **R4 审查探针 (`docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs`)**: **6/8 通过** (U05/U06 保持待解决状态并归入 R4-C)
- **历史探针回归 (R1–R3 46 项)**: **46/46 全部通过**
- **全量自动化测试套件 (`pnpm test`)**: **11 个测试文件，91 项测试全部通过 (0 失败)**
- **B01–B12 证据矩阵**: 完整覆盖 12 项数据与升级可靠性不变量，详见 [交付报告](reviews/2026-09-29-m0-m1-r7/implementation-r4-b3/README.md#3-b01b12-断言证据矩阵)。
- **M2.1 就绪状态**: **尚未就绪**（需待后续 R4-C 修复 U05 关系校验与 U06 截断流处理后方可进入）。

---

## M0/M1-R4-B.4-1：恢复空间创建重试与重复启动交付记录 (2026-09-29)

本节保留实现者的交付声明。独立结论以 [R9 审查](reviews/2026-09-29-m0-m1-r9/README.md) 为准：目标功能通过，正式测试中的响应故障/迁移回滚覆盖和实现者归档仍需补齐；后续 B.4-2 对应 L04–L07，B.4-3 对应 L03。

详见 [R4-B.4-1 交付报告](reviews/2026-09-29-m0-m1-r8/implementation-r4-b4-1/README.md)。

### 1. 核心改进与根因修复
- **修复正常 space.create 重放与实例级作用域 (R8-F01 / L01)**:
  - 根因：`SpaceService.createSpace` 记录幂等日志时使用 `spaceId='instance'`，但在 `reconstructFromValidRef` 与 `reconstructResult` 中此前要求空间记录的 `space_id` 必须与传入的上下文 `spaceId` 相等，导致 `spc_... === 'instance'` 校验失败并抛出 422；同时 `createSpace` 初始返回未同步成员变更后的 `acl_epoch`。
  - 修复：针对 `space.create` 幂等重建显式允许 `spaceId === 'instance'` 作用域；`createSpace` 返回事务提交时最新的 space 状态（保证初始响应与重放响应完全严格相等）；迁移路径与引用解码器正确映射 `space.create` 作用域。
- **不可重放标记跨重启稳定持久化 (R8-F02 / L02, L08)**:
  - 根因：`bootstrap.ts` 迁移中生成的 `unreplayable` 标记包含完整操作标识（如 `thread.patch:thd_123`），而旧版 `validateResultRef` 仅接受 `family` 格式（`thread.patch`），造成二次启动自锁崩溃；同时文档误宣称了未注册的原因。
  - 修复：规范 `validateResultRef` 支持规范的操作字符串精确绑定（`obj.op === operation`），并向下兼容遗留的 family 模式；文档同步收敛至已正式注册的白名单原因（`historical_relation_version_unrecoverable` 与 `historical_thread_version_unrecoverable`）；compact 迁移器在写入前先校验生成标记。

### 2. 验收证据与测试状态
- **本轮 R8 审查探针 (`docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs`)**:
  - **L01 通过**: 正常同键空间创建重放返回 201 且数据完全一致，无额外写入。
  - **L02 通过**: 生成的不可重放标记在多次数据库重启后平稳接受，不再自锁。
  - **L08 正向对照通过**: 正常主题重试与可恢复的历史完整数据稳定支持。
  - **L03–L07 保持待解决**: 明确作为后续 R4-B.4-2 与 R4-B.4-3 的子包待交付内容。
- **全量自动化测试套件 (`pnpm test`)**: **11 个测试文件，99 项测试全部通过 (0 失败)**，较 R7 增加 8 项专用回归测试。
- **所有历史探针回归**:
  - R7 `check-b2-completeness.mjs`: 7/7 通过
  - R7 `check-legacy-fixture.mjs`: 1/1 通过
  - R6 `check-upgrade-boundaries.mjs`: 10/10 通过
  - R5 `check-r4b-gaps.mjs`: 9/9 通过
  - R4 `check-unfinished-contracts.mjs`: 6/8 通过 (U05/U06 保持为 R4-C 待办缺陷)
  - R3 `check-invariants.mjs`: 10/10 通过
- **就绪声明**: **本轮未宣称整个 R4-B 完成，未执行 R4-C，未进入 M2.1**。

---

## M0/M1-R4-B.4-2：统一历史结果与引用校验交付记录 (2026-09-29)

本节保留实现者自报。独立结论以 [R10 审查](reviews/2026-09-29-m0-m1-r10/README.md) 为准：指定 L04–L07 已通过，但共同验证、嵌套关系绑定、旧在线历史投影和缺失时间处理仍有遗漏；交付原始输出/指纹仍缺，不认定整包完成。L05 的原缺陷归属是 R8-F03。

详见 [R4-B.4-2 交付报告](reviews/2026-09-29-m0-m1-r9/implementation-r4-b4-2/README.md)。

### 1. 核心改进与根因修复
- **固化 B.4-1 与决策归档 (R9-E01 / R9-E02 / ADR-014)**:
  - 增加真实 Fastify onSend 500 故障注入、多连接并发及跨重启重放测试（L01-3, L01-5, L02-3a–d）。
  - 在 `docs/12-decisions.md` 中正式归档 ADR-014，同步更新 `docs/03-data-model.md` 与 `docs/04-protocol.md`，对齐完整目标 `op` 绑定、启动规整、白名单原因与 422 `RESYNC_REQUIRED` 协议规范。
- **历史嵌套关系快照真实性与不可重放降级 (R8-F03 / L04)**:
  - 根因：历史 `$ref: 'post'` 仅记录 `relation_ids`，缺少 `version`/`state`，先前重建直接读当前关系，导致修改后的关系冒充历史状态。
  - 修复：历史数据迁移若缺少可靠关系快照，安全降级为 `unreplayable` (`historical_relation_version_unrecoverable`)；重放时若缺失嵌套关系快照拒绝假冒并返回 422 `RESYNC_REQUIRED`；`post.create` 初始无关联关系时忠实保留 `relations: []`。
- **历史操作时间戳冲突原子回滚 (R8-F04 / L05)**:
  - 根因：先前仅比较 `title` 与 `state`，忽略 `created_at`，导致相同版本号的时间戳冲突无法被察觉。
  - 修复：迁移核对时增加 `created_at` 不可变一致性强校验，检测到时间戳冲突立即中止并原子回滚；严禁使用挂钟时间伪造历史记录。
- **跨实体引用完整性与语义边界强校验 (R8-F04 / L06)**:
  - 根因：先前仅断言字段类型，未校验跨实体所属关系及语义一致性。
  - 修复：抽取共享的 `validateResultRefSemantics`，覆盖全部操作族的实体存在性、版本匹配与空间所属关系（如 `initial_post` 必须属于同一主题、决议记录版本与动作必须精确匹配）；迁移与重放全通路统一调用。
- **编码器出口校验与成对字段无缝防穿透 (R8-F04 / L07)**:
  - 根因：`extractResultRef` 出口未断言合法性，成对字段（如 `initial_post_id` 与 `initial_post_revision`）缺少互锁。
  - 修复：`extractResultRef` 出口强制调用 `validateResultRef`，规范成对字段必须同时存在或缺省，禁止无初始帖子时携带关系字段；迁移未知操作原子回滚。

### 2. 验收证据与测试状态
- **本轮 R8 审查探针 (`docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs`)**:
  - **7/8 通过**: L01, L02, L04, L05, L06, L07, L08 全部通过。
  - **L03 保持预期失败**: 明确归属后续任务 **B.4-3 / R8-F05**。
- **本轮 R9 验收探针 (`docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs`)**:
  - **5/5 (N01–N05) 全部通过**。
- **全量自动化测试套件 (`pnpm test`)**:
  - **11 个测试文件，107 项测试全部通过 (0 失败)**。
  - `tests/integration/m0-m1-r4-b-regression.test.ts` 43/43 全部通过。
- **所有历史探针回归**:
  - R7 `check-legacy-fixture.mjs`: 1/1 通过 (K01)
  - R7 `check-b2-completeness.mjs`: 7/7 通过 (J01–J07)
  - R6 `check-upgrade-boundaries.mjs`: 10/10 通过 (H01–H10)
  - R5 `check-r4b-gaps.mjs`: 9/9 通过 (G01–G09)
  - R4 `check-unfinished-contracts.mjs`: 6/8 通过 (U05/U06 保持为已知后续缺陷)
  - R1–R3 探针 (46 项): 全部通过
- **代码质量**: `pnpm typecheck` 全部通过；`pnpm lint` 全部通过。
- **就绪声明**: **本轮未宣称整个 R4-B 完成，未执行 R4-C，未进入 M2.1**。

---

## M0/M1-R4-B.4-2R：统一验证入口与历史结果保真交付记录 (2026-09-30)

本节保留实现者原始交付声明，**不等同于验收**。[R11 独立复核](reviews/2026-09-30-m0-m1-r11/README.md)确认测试总数和 P 全通，但“全部入口统一”“L02-3c 全库快照已补齐”等说法超出实现；R1–R3 缺实现者本轮运行日志，由 R11 另行复跑确认。下文 P04/P05、证据补项编号及 U05 描述的勘误见 [coverage-audit](reviews/2026-09-30-m0-m1-r11/coverage-audit.md)。

本轮任务聚焦于关闭 [R10 审查](reviews/2026-09-29-m0-m1-r10/README.md) 中发现的 R10-F01–F04（P01–P05）四类缺陷，保持合法正向对照 P06 通过，统一全部入口的验证与历史保真流程，并补齐完整的逻辑快照回滚与真实 HTTP 重放回归断言。

详见 [R4-B.4-2R 交付报告](reviews/2026-09-29-m0-m1-r10/implementation-r4-b4-2r/README.md)。

### 1. 核心改进与根因修复
- **嵌套关联关系历史版本强校验与实体所属绑定 (R10-F01 / P01)**:
  - 根因：`validateResultRefSemantics` 对嵌套 relations 仅核验了 relation 记录在 relations 表中的存在性，未校验其所属的 `source_post_id`、`source_revision`、`target_post_id` 是否位于当前 space 内，且未校验传入的 `version` 和 `state` 是否与该版本决议历史真实一致，造成不一致版本或伪造状态绕过。
  - 修复：在 `IdempotencyService.validateSemanticsForNestedRelations` 中增加严格校验：
    1. 校验 `relation.space_id === spaceId`、`relation.source_post_id === expectedPostId`、`relation.source_revision === expectedPostRevision`。
    2. 校验目标帖子及其 revision 存在于同 space 内。
    3. 校验关系版本边界：`r.version <= rel.version`。
    4. 校验版本 1 时的初始状态规则（challenges 必须为 `'open'`，supports 必须为 `'resolved'`）。
    5. 当 `1 < r.version < rel.version` 时，通过新增的 storage 端口 `findRelationResolutionByVersion` 校验历史决议的版本与动作；若状态不匹配，立即抛出 422 `RESYNC_REQUIRED`。
- **编码器出口与迁移严格前置校验 (R10-F02 / P02)**:
  - 根因：`extractResultRef` 针对非法的非安全整数或非枚举状态进行了默认值回退（`?? 1`、`?? 'open'`），掩盖了业务层逻辑错误；迁移器在降级为 `unreplayable` 之前没有前置校验 `v === 1` 引用的结构合法性（包括 forbidden content、kind-op 不匹配、多余未声明键、重复 relation_id 等），使伪造结构逃脱了迁移事务回滚。
  - 修复：
    1. `extractResultRef` 强制要求安全正整数与合法状态枚举，不合法直接抛出 400 `VALIDATION_ERROR`，严禁隐式修正。
    2. `executeIdempotent` 在事务内提交前，对新生成的 `IdempotencyResultRef` 同步执行 `validateResultRef` 与 `validateResultRefSemantics`，保证进入数据库的引用必定合法。
    3. `bootstrap.ts` 在 `migrateSingleRef` 中对 `v === 1` 的既有引用首先执行严格结构预检（`hasForbiddenContent`、白名单字段、targetId 匹配、状态/版本类型等），发现非法输入立即抛出异常并触发整笔迁移事务回滚。
- **旧格式在线重放路径与投影统一 (R10-F03 / P03, P04)**:
  - 根因：旧版全量 JSON 结果的在线重放单独保留了一套 `reconstructResult` legacy 逻辑，导致旧格式重放与规范的 `IdempotencyResultRef` 验证/重建逻辑分叉；且对旧格式中的伪造实体缺少语义过滤。
  - 修复：
    1. 在 `reconstructResult` 中，统一将旧格式 payload（无论是包外壳格式还是直接实体格式）通过 `normalizeLegacyResultRef` 规范化为标准的 `IdempotencyResultRef`。
    2. 统一委托给 `reconstructFromValidRef` 与 `validateResultRefSemantics` 执行统一的语义校验与实体投影重建，彻底消除了 legacy 重建路径与 typed 重建路径的分叉。
- **彻底消除挂钟时间伪造，历史冲突强原子回滚 (R10-F04 / P05)**:
  - 根因：`bootstrap.ts` 在迁移旧库回填 `thread_versions` 时，曾有两处在缺失历史时间戳时回退使用 `new Date().toISOString()` 挂钟时间，违反了历史确定性原则与快照保真要求。
  - 修复：移除所有 `new Date().toISOString()` 伪造挂钟时间回退；当无法从实体真实历史数据证明时间时，直接抛出异常中止并原子回滚迁移事务。
- **补齐缺失的正式回归与在线断言 (R10-E01 / R10-E02 / R10-E03)**:
  - 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中：
    1. 为 `L02-3c`、`L05`、`L07` 补齐了完整的数据库逻辑快照对比，断言迁移回滚后数据库恢复至初始状态，无任何中间残留。
    2. 为 `L06` 补齐了真实 Fastify HTTP 在线重放断言，验证跨实体引用非法时在线接口返回结构化 422 `RESYNC_REQUIRED`。
    3. 增加了 P01–P05 的专属测试用例，覆盖全部 R10 边界。

### 2. 验收证据与测试状态
- **本轮 R10 边界探针 (`docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs`)**:
  - **6/6 (P01–P06) 全部通过 (0 失败)**：P01 嵌套绑定、P02 编码校验、P03 旧格式投影、P04 旧格式分叉、P05 挂钟时间回滚全部修复关闭；P06 合法正例通过。
- **全量自动化测试套件 (`pnpm test:all`)**:
  - **11 个测试文件，112 项测试全部通过 (0 失败)**。
  - `tests/integration/m0-m1-r4-b-regression.test.ts`: **48/48 全部通过**。
- **历史探针与审查脚本回归**:
  - R9 `check-b4-1-acceptance.mjs`: **5/5 通过** (N01–N05)
  - R8 `check-b3-gates.mjs`: **7/8 通过** (L01, L02, L04, L05, L06, L07, L08 通过；L03 保持预期失败并归属 B.4-3)
  - R7 `check-b2-completeness.mjs`: **7/7 通过** (J01–J07)
  - R7 `check-legacy-fixture.mjs`: **1/1 通过** (K01)
  - R6 `check-upgrade-boundaries.mjs`: **10/10 通过** (H01–H10)
  - R5 `check-r4b-gaps.mjs`: **9/9 通过** (G01–G09)
  - R4 `check-unfinished-contracts.mjs`: **6/8 通过** (U05/U06 保持预期失败并归属 R4-C)
  - R3 `check-invariants.mjs`: **10/10 通过** (T01–T11)
  - R1–R3 探针: **46/46 全部通过**
- **代码质量**: `pnpm typecheck` **0 错误**；`pnpm lint` **0 错误**。
- **就绪与边界声明**:
  - **本轮未宣称整个 R4-B 完成**：L03 结构预检与 DDL 单一来源、原 B01–B12 完整证据留待后续子包 **B.4-3** 完成。
  - **本轮未执行 R4-C**：U05 跨空间关系拒绝与 U06 截断流处理保持为 R4-C 待办。
  - **未进入 M2.1**。

---

## M0/M1-R4-B.4-3：结构预检与原 B 验收证据交付记录 (2026-10-01)

> 以下保留实现者当时的交付声明。R15 确认 136 项测试、单元 A 和 L03 原反例通过，但未接受整包完成结论；损坏库分类、结构语义、迁移 DDL 来源及证据问题见 [R15 审查](reviews/2026-10-02-m0-m1-r15/README.md)。

本轮任务完成 M0/M1-R4-B 数据包的最终收口包 **B.4-3**，关闭 [R14 审查](reviews/2026-10-01-m0-m1-r14/README.md) 中发现的 R14-F01（X03）前置补项，建立单一 DDL 来源与全量结构预检防线，彻底关闭历史遗留缺陷 **L03**，补齐原 B01–B12 完整验收矩阵与全量 22 项验证命令执行证据。

详见 [R4-B.4-3 交付报告](reviews/2026-10-01-m0-m1-r14/implementation-r4-b4-3/README.md)。

### 1. 核心改进与根因修复
- **单元 A：未来关系版本与状态矛盾降级前强校验 (R14-F01 / X03)**:
  - 根因：`idempotency-service.ts` 在处理旧版 `$ref: 'relation'` 记录时，若缺少决议历史且引用的版本号大于当前库中该 relation 的已知版本（`v > rel.version`），曾直接降级为不可重放标记（marker），使不可能发生的未来版本非法绕过；且对实体状态与决议动作的语义一致性缺少前置验证。
  - 修复：
    1. 在 `validateNestedRelationsKnownFacts`、`validateStoredResultRefPrecheck` 及 `normalizeLegacyResultRef` 中统一增加强校验：当 `v > rel.version` 时，判定为与已知事实矛盾，直接抛出 422 `RESYNC_REQUIRED`（在线重放）或触发迁移事务回滚（启动升级），绝对禁止静默降级为 marker。
    2. 校验 relation 状态（challenges 必须为 `'open'`，supports 必须为 `'resolved'`），杜绝伪造初始状态。
    3. 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中补齐 V01–V02 及 X01–X03 的单体服务与真实 HTTP 双入口测试。
- **单元 B：权威单一 DDL 来源与全量物理结构预检 (R8-F05 / L03 / ADR-019)**:
  - 建立单一 DDL 权威：确立 `packages/storage-sqlite/src/schema.sql` 为唯一 DDL 源码，新增 `generate-schema.mjs` 生成 `schema.ts`，新增 `check-schema-sync.mjs` 在 `prebuild`、`build` 和 `lint` 中强制执行同步核验。
  - 全量物理结构预检（Fail-Fast）：
    1. 在 `schema.ts` 中定义全量 22 张 v2 表与 20 张 v1 表的物理结构需求（`TableRequirement`），涵盖所有列名、类型亲和性、NOT NULL 约束、主键与复合主键列物理顺序（特别确保 `idempotency_records (actor_id, space_id, operation, key)` 复合主键完整性）、外键约束、唯一约束及显式索引定义与列序。
    2. 在 `classifyDatabase` 中调用 `verifyDatabaseStructure`，在启动最初期检查数据库。缺失关键主键或结构损坏判定为 `corrupt`，在绑定监听套接字（listen socket）或进行任何运行时业务前强行退出并立即释放文件锁。
    3. 彻底关闭 **L03**，`check-b3-gates.mjs` 达成 **8/8 全部通过**。
    4. 在 `tests/integration/m0-m1-r4-b-regression.test.ts` 补齐 B2 结构矩阵（B2-1 至 B2-8）8 组测试用例。
- **单元 C：原 B01–B12 完整验收矩阵与 22 项验证命令执行**:
  - 整理完整的 B01–B12 验收证据映射表，明确各项子条件、正式测试位置与可复跑脚本。
  - 完整执行全部 22 项验证命令，其中 21 项以 exit 0 通过，仅 Command #13（`check-unfinished-contracts.mjs` 检查 U05/U06）以 exit 1 退出（明确属于 R4-C 范围，符合规划）。

### 2. 验收证据与测试状态
- **核心探针关闭确认**:
  - `check-b3-gates.mjs`: **8/8 全部通过** (L01–L08 全部通过，L03 已关闭！)
  - `check-legacy-helper-boundaries.mjs`: **3/3 全部通过** (X01–X03 全部通过，X03 已关闭！)
  - `check-legacy-input-presence.mjs`: **3/3 全部通过** (W01–W03 全部通过)
  - `check-precheck-completeness.mjs`: **5/5 全部通过** (V01–V05 全部通过)
- **全量自动化测试套件 (`pnpm test:all`)**:
  - **11 个测试文件，136 项测试全部通过 (0 失败)**。
  - `tests/integration/m0-m1-r4-b-regression.test.ts`: **72/72 全部通过**。
- **22 项全量验证套件执行结果 (`run-all-22.mjs`)**:
  - 21 项命令以退出码 0 通过：构建检查（#3, #4）、代码质量（#5, #6）、全量测试（#7, #8）、历史探针（#9–#12, #14–#24 全部 exit 0）。
  - 仅 1 项命令（#13 `probe-r4-unfinished-contracts`）以退出码 1 退出，其仅失败项 U05/U06 归属未开始的 R4-C。
- **代码质量与一致性**:
  - `pnpm run check:schema`: **通过 (DDL 与 schema.ts 严格一致)**
  - `pnpm typecheck`: **0 错误**
  - `pnpm lint`: **0 错误**
- **就绪与边界声明**:
  - **M0/M1-R4-B (B.1, B.2, B.3, B.4-1, B.4-2, B.4-3) 全部按契约完成，已具备独立复核验收条件**。
  - **未执行 R4-C**：U05（跨空间关系拒绝）与 U06（截断流消费防线）保持为 R4-C 范围待办。
  - **未进入 M2.1**。

---

## M0/M1-R4-B.4-3R：完成结构判定、迁移 DDL 复用与真实验收证据交付记录 (2026-10-02)

本节保留实现者的交付声明。独立结论以 [R16 审查](reviews/2026-10-02-m0-m1-r16/README.md) 为准：140 项和原 24 条命令结果属实，指定修复有效，但索引/FTS 语义、结构描述来源及少量 B 证据未完成；下文“全部关闭/全部按契约完成”未获独立验收。

本轮任务完成 M0/M1-R4-B 数据包的最终补正收口 **B.4-3R**，关闭 [R15 审查](reviews/2026-10-02-m0-m1-r15/README.md) 中发现的全部三项关键缺陷（R15-F01、R15-F02、R15-F03）以及交付证据缺陷（R15-E01），全面落实语义结构预检、单源迁移 DDL 常量复用、11 操作族全量回放验证与全量 24 项验证命令真实执行。

详见 [R4-B.4-3R 交付报告](reviews/2026-10-02-m0-m1-r15/implementation-r4-b4-3r/README.md)。

### 1. 核心改进与根因修复
- **单元 1：分类与语义结构预检强防线 (R15-F01 & R15-F02 / Y01–Y04)**:
  - 区分真实空库与残存初始化材料（Y02）：在 `classifyDatabase` 中增加判定，若数据库无迁移记录但已存在 `instance_metadata` 且包含 `initialized='true'` 或 `token_secret`，严格分类为 `corrupt`，杜绝误判为 `blank` 导致重新签发管理员凭据或覆写已有密钥；CLI `init`、`serve` 及 `bootstrapDatabase` 入口均直接以 403 `FORBIDDEN` 明确拒绝，释放文件锁且库文件保持未变更。
  - 排查历史迁移与结构矛盾（Y03）：若数据库已包含 v2 历史表 `thread_versions` 但缺少版本 2 迁移记录，严格分类为 `corrupt`，杜绝在 `applyMigrations` 中自动执行版本 2 修补。
  - 深入语义结构检查（Y01）：
    1. 非 Partial 索引与唯一约束：在 `verifyTableStructure` 中利用 SQLite `PRAGMA index_list` 的 `partial` 属性，要求所有必需全量 UNIQUE 约束与显式索引（如 `idx_events_space_seq`）必须为 `partial === 0`，坚决拒绝 `UNIQUE INDEX ... WHERE 0` 等伪装约束。
    2. 外键更新/删除动作：利用 `PRAGMA foreign_key_list` 校验 `on_update` 与 `on_delete` 必须为默认的 `'NO ACTION'`，坚决拒绝未经授权的 `ON DELETE CASCADE` 等危险动作。
    3. 全文检索虚拟表：校验 `post_fts` 必须为使用 `fts5` 模块的虚拟表（`CREATE VIRTUAL TABLE ... USING fts5`）且配置 `tokenize="trigram"`，坚决拒绝普通数据表伪装。
  - 保持全部 5 项健康对照（Y04）：空文件、裸 v2 DDL 库、裸 v1 DDL 库、真实 v1 历史实例及健康 v2 实例均正常启动。
- **单元 2：权威 DDL 迁移常量单源复用与结构对称性验证 (R15-F03)**:
  - 迁移 DDL 常量自动生成：更新 `generate-schema.mjs`，从权威 `schema.sql` 中精确抽取生成并导出 `SCHEMA_MIGRATIONS_DDL`、`INSTANCE_METADATA_DDL` 与 `THREAD_VERSIONS_DDL` 常量。
  - 校验脚本单源核验：更新 `check-schema-sync.mjs`，在构建与 lint 中同步检查 `SCHEMA_SQL` 与上述 3 个迁移 DDL 常量是否与 `schema.sql` 保持完全一致。
  - 消除手写重复 DDL：在 `bootstrap.ts` 中完全采用导出的迁移 DDL 常量替换 `applyMigrations` 中的手写硬编码建表语句。
  - 增强集成测试 DDL 对称性：在 `packages/storage-sqlite/tests/storage.test.ts` 中通过 `PRAGMA index_xinfo` 与虚拟表 SQL 比对，严格验证直接全新建库与升级旧库的表结构、索引列序、唯一性、partial 谓词与虚拟表配置逐项完全一致。
- **单元 3：正式测试与验收证据补齐 (R15-E01 / B01–B12)**:
  - B01 全量 11 操作族回放验证：覆盖 `space.create`、`space.patch`、`thread.create`、`thread.patch`、`post.create`、`post.revision`、`post.withdraw`、`relation.create`、`relation.resolve`、`relation.reopen`、`admin.redaction` 全部 11 个实际操作族；为各操作提供独立实体上下文，验证初次写入、同连接回放完全深度一致、无副作用（事件行与幂等行数不变）、以及数据库关闭并重新从磁盘打开后的持久解码回放一致性。
  - B06 真实触发器故障注入调整：采用 G03 exec 拦截器模式，在迁移执行 `CREATE TABLE IF NOT EXISTS thread_versions` 时挂载 TEMP 触发器 `fail_thread_history`，验证 `threw === true`、`faultHits === 1`、事务完整原子回滚（`schema_migrations` 维持版本 1），且重开数据库后 `fullLogicalSnapshot` 与迁移前完全一致。
  - B08 重开重试验证：在触发器回滚后，显式关闭数据库连接并从磁盘重新打开，验证重开后的干净初始化与仅签发 1 次凭据。
  - B2-3, B2-4, B2-5 补齐重开快照断言：在拒绝损坏结构后，显式关闭连接并从磁盘重新打开，断言逻辑快照与损坏前完全一致。
  - 新增 Y01–Y04 专属回归套件：在 `tests/integration/m0-m1-r4-b-regression.test.ts` 中新增包含 4 项测试的完整回归组。

### 2. 验收证据与测试状态
- **核心探针关闭确认**:
  - `check-structural-boundaries.mjs`: **4/4 全部通过** (Y01–Y04 全部通过，退出码 0！)
  - `check-ddl-build.mjs`: **通过** (退出码 0！)
  - `check-b3-gates.mjs`: **8/8 全部通过** (L01–L08 全部通过)
  - `check-legacy-helper-boundaries.mjs`: **3/3 全部通过** (X01–X03 全部通过)
  - `check-legacy-input-presence.mjs`: **3/3 全部通过** (W01–W03 全部通过)
  - `check-precheck-completeness.mjs`: **5/5 全部通过** (V01–V05 全部通过)
- **全量自动化测试套件 (`pnpm test:all`)**:
  - **11 个测试文件，140 项测试全部通过 (0 失败)**。
  - `tests/integration/m0-m1-r4-b-regression.test.ts`: **76/76 全部通过**。
- **24 项全量验证套件执行结果 (`run-all-24.mjs`)**:
  - **23 项命令以退出码 0 通过**：构建检查（#1, #2）、代码质量（#3）、全量测试（#4）、历史与本轮审查探针（#5–#10, #12–#24 全部 exit 0）。
  - **仅 1 项命令（#11 `probe-r4-unfinished-contracts`）以退出码 1 退出**，其仅失败项 U05/U06 明确归属未开始的 R4-C。
- **代码质量与一致性**:
  - `pnpm run check:schema`: **通过 (DDL 与 schema.ts 严格一致)**
  - `pnpm typecheck`: **0 错误**
  - `pnpm lint`: **0 错误**
- **就绪与边界声明**:
  - **M0/M1-R4-B 全部按契约完成，已具备独立复核验收条件**。
  - **未执行 R4-C**：U05（跨空间关系拒绝）与 U06（截断流消费防线）保持为 R4-C 范围待办。
  - **未进入 M2.1**。

## R16 独立复核摘要 (2026-10-02)

- 正式套件 140/140（B 76 项）通过。原 24 条命令独立复跑与交付一致，只有 R4/U05、U06 对应命令 exit 1。新增 Z 探针 2/4，故本轮 25 条验证命令中 23 条 exit 0、2 条 exit 1。
- R15-F01 关闭：Y02/Y03 函数入口与真实 CLI init/serve 均拒绝矛盾材料，重开快照不变，不增发凭据，锁释放。迁移 DDL 单源常量复用、B01 11 族实际重放、B06/B08/B2 的指定补项通过。
- R16-F01/F02：表达式键被丢弃、collation/排序未比对；FTS 正文 UNINDEXED 未识别。临时坏库被当健康库接受，实际观察到重复 token_hash 可插入、不同大小写请求键错误冲突、正文搜索漏命中。
- R16-F03/E01：当前/历史结构描述还未绑定各自 DDL 来源；B01 业务不变断言和 B03 两种旧结果完整重开重放需补，其他已有证据准确归属即可。
- 下一包 [B.4-3R2](reviews/2026-10-02-m0-m1-r16/next-agent-prompt.md) 只收尾上述项；已通过历史修复不重做。之后依次为 R4-C、M2.1；Web、四宿主完整联调、正式评审等未提前完成。
- 本次只新增审查证据并同步当前状态入口，未修改产品源码/正式测试/旧探针或历史交付。完整结果见 [R16 验证记录](reviews/2026-10-02-m0-m1-r16/verification.md)。

## R17 独立复核摘要 (2026-10-02)

- 正式套件 146/146（B 81 项）通过，旧 25 命令与交付一致，仅 R4/U05、U06 对应命令 exit 1；新增 AA 检查 1/4，通过完整输入正例，剩余 AA01–AA03 失败。共 26 个不同命令，24 条 exit 0、2 条 exit 1。
- 原索引表达式/collation/排序拒绝、B01 完整逻辑快照、B03 对称旧 resolve/reopen 重开重放均通过。初始化、迁移 DDL 复用、历史结果等已关闭项不重做。
- R17-F01：额外 FTS detail=none 被当作健康结构接受，相同正文搜索从 200/1 条变成 500。R17-F02：生成描述缺少部分索引/FTS 语义；驱动或历史源缺失时跳过检查并报告成功，坏 profile 仍保留。
- 纠正隔离验收安排：R15 四文件夹具缺少新生成器输入，不能继续承担完整生成校验；保留旧脚本/历史输出，完整依赖与历史源的继任夹具负责验证。不能为旧夹具继续静默跳过。
- R17-E01 仅需报告勘误：恢复真实 11 族与原 B 编号含义，正确引用 N01、U07/U08 及实际生成检查断言。下一包 [B.4-3R3](reviews/2026-10-02-m0-m1-r17/next-agent-prompt.md) 不重新开发已通过的 B01/B03。
- 本轮清单从 85 补到 88，新增清点的是三个与 HEAD 相同的既有 modules/review 文件，不是新评审功能。产品源码/正式测试/历史证据保持原样；完整证据见 [R17 验证记录](reviews/2026-10-02-m0-m1-r17/verification.md)。


## R18 独立复核摘要 (2026-10-02)

- 正式套件 147/147（11 文件，B 82 项）通过；25 条既定命令独立复跑与交付一致，24 条 exit 0，仅 R4/U05、U06 对应命令 exit 1。AA01–AA04 与 Z01–Z04 全通。
- R17-F01 关闭：FTS detail=none 在三个函数入口判 corrupt、拒绝启动，重开快照不变。UNIQUE/命名索引与 FTS 来源跟随、缺驱动/历史源失败及无 src 正例通过；原历史结果/初始化修复保持。
- R18-F01：PK collation/desc 未写入描述，也未在生成阶段拒绝；改变源后 generate/check 均 0，运行时拒绝。R18-F02：缺 MIGRATION_DDL 起止标记时生成仍 0 且部分写出，随后 check 1。
- 新 AB 2/4：AB01/AB02 失败，AB03/AB04 正例通过；本轮合计 26 个不同命令，24 条 exit 0、2 条 exit 1。相关生成故障检查尚需进入正式套件。
- 基线 89 文件（新增共享提取器）：5 个既有文件修改、1 个新增、83 个不变。R17 的一份 observed 文件在本轮开始前被覆盖；交付只存 500 字符摘要。已记录原/现哈希，本轮另存完整独立输出，不凭摘要编造恢复。
- 下一包 [B.4-3R4](reviews/2026-10-02-m0-m1-r18/next-agent-prompt.md) 限定为两处生成遗漏、正式回归和归档说明；不重做已通过功能，不开始 R4-C/M2。完整证据见 [R18 验证记录](reviews/2026-10-02-m0-m1-r18/verification.md)。


## R19 独立复核摘要 (2026-10-02)

- 152/152 正式测试（12 文件，B 82 项、生成 5 项）通过，26 条命令独立复跑与交付一致；25 条 exit 0，仅 R4 因 U05/U06 exit 1。AA/AB 各 4/4。
- R18-F01/F02 功能关闭：共享提取器拒绝不受支持的 PK 语义；缺迁移标记时写前拒绝、目标哈希不变。历史行为及完整输入正例保持。
- R19-F01 为正式测试缺口：命名索引用例替换了不存在的 SQL，变异实际为 no-op；V1 修复、FTS 来源、profile 差异和缺输入恢复的有限矩阵需补齐。没有据此认定新的生产故障。
- 26 份完整交付日志、before/after 和历史保留情况已核对。R19-E01 要求新报告更正 U05/U06 含义、R17 原哈希/覆盖归因、R10 路径及过强生成保证；不改历史材料。
- 下一包 [B-GATE+C](reviews/2026-10-02-m0-m1-r19/next-agent-prompt.md)：A 达标后同回合进入 R4-C，关闭非法关系写入、损坏响应误报成功并完成请求/取消/Pi 契约；A+C 最终一并交回复核。M2 尚不实施。
- 本次只新增 R19 审查资料并同步当前状态入口，源码/正式测试/旧探针不改。完整记录见 [R19 验证](reviews/2026-10-02-m0-m1-r19/verification.md)。


## R20 独立复核摘要 (2026-10-02)

- 166/166 正式测试（13 文件，B 82、生成 6、C 13）及原 26 条命令全部通过，R4 U01–U08 为 8/8，U05/U06 原问题关闭。
- B 功能与正式回归验收通过：真实索引/FTS 变异、V1/V2 修复、缺输入拒绝与恢复均已落实；不再开启 B 修复循环，交付文字勘误随 C 完成。
- 新 AC 检查 2/6。AC01 发现 query/引用/请求解析/无 body 写入口遗漏，以及默认 client.poll 不传可选 query 返回 400；AC02 接受非法已知响应字段；AC03 将含 aborted 的业务错误误判为取消；AC04 未处理 fetch cause、Retry-After 和不可重试类别优先级。
- AC05 取消阶段、超时和最终外部 signal 监听器清理通过；AC06 注册 Pi 命令的 UI/无 UI 成功输出和坏 JSON 工具失败通过。未将这些受控检查当真实宿主认证。
- 交付 93 项 after 指纹吻合，52 份分阶段日志存在；最终 runner 成功 stderr 未采集，测试摘要硬编码，正式覆盖/契约/OpenAPI/进度同步仍待完成。
- 下一包 [R4-C.1](reviews/2026-10-02-m0-m1-r20/next-agent-prompt.md) 限定于四类 C 问题与必要覆盖/文档，要求原 26 条加 AC 共 27 条全部通过后交回复核；不开始 M2。完整证据见 [R20 验证](reviews/2026-10-02-m0-m1-r20/verification.md)。

## R21 独立复核摘要 (2026-10-02)

- C.1 修改 11 个产品/测试文件，before/after 93 文件与实际工作区对应。169/169 正式测试（13 文件，B 82、生成 6、C 16）与继承 27 条命令全部通过；U 8/8、AC 6/6。
- R20-F02 成功信封修复关闭；AC01 具体输入、含 aborted 的业务冲突、cause 网络重试和 400 禁重试均已确认。B 包保持验收，不增加新数据库/升级任务。
- AD01–AD05 对原 C.1 要求的有限补查复现三组遗漏：写入口未知参数/无 body 政策与 OpenAPI 占位定义；未取消 AbortError 和传输错误来源；请求资源跨退避阶段及超限 Retry-After 提前重试。
- Pi 正式测试已用自己的随机端口；取消阶段/资源断言、命令成功失败内容、schema 局部类型边界仍需补。169 总数属实，交付覆盖表含不存在的文件和错误计数，下一包据实更正。
- 下一包 [R4-C.2](reviews/2026-10-02-m0-m1-r21/next-agent-prompt.md) 只关闭 R21-F01～F03 和相关覆盖/文档，要求最终 28 条命令、AC/AD/U 全通后交回复核。不开始 M2；之后目标是 M2.1 附件包。
- 当前仍未完成四类真实宿主联调、Web、正式独立评审或研究效果评估。本次未调用模型、未启动其他 Agent、未修改全局配置，产品源码与正式测试未由审查者修改。

完整证据见 [R21 验证](reviews/2026-10-02-m0-m1-r21/verification.md) 和 [覆盖核对](reviews/2026-10-02-m0-m1-r21/coverage-audit.md)。
