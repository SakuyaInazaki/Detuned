# 下一轮提示词：M0/M1-R4-B.4-1

以下正文可以直接交给 coding agent。**本轮只完成两个明确行为，其他缺口保留，不再要求一次交付整个数据包。**

---

继续在 `/Users/sakimi/Desktop/Detuned` 工作。本轮为 **M0/M1-R4-B.4-1：恢复空间创建重试与重复启动**，仅关闭 R8-F01、R8-F02。R8-F03–F05 和尚缺的 B 验收条件按本目录 remaining-work.md 后续处理。本轮不执行 R4-C，不开始 M2.1，也不声明整个 R4-B 完成。

当前 HEAD 为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a`，工作区有未提交实现。先检查 Git 状态，保留全部已有实现和审查材料。不要 reset/clean/checkout 覆盖文件，不改历史 observed。默认不启动其他 Agent、不调用模型、不发布/推送/部署、不修改用户全局配置；仅使用本轮自建临时数据库和合成凭据。

先读 AGENTS.md、README.md、docs/00-implementation-brief.md、docs/08-roadmap.md、docs/11-development-standards.md，然后读 docs/03、04、07、12，以及：

1. `docs/reviews/2026-09-29-m0-m1-r8/README.md`，重点 R8-F01/F02。
2. 同目录 `coverage-audit.md`、`remaining-work.md`、`verification.md`、`baseline.json`。
3. 同目录 `check-b3-gates.mjs`、`observed-b3-gates.json`，重点 L01、L02、L08。

本轮审查已确认 91 项正式测试与旧 G/H/J/K 全绿，但 L01–L07 失败。两处 T06 的历史 DDL setup 已修正，应保留，不恢复旧的删 metadata 夹具。先报告任务编号、行为变化、涉及文件与验收方式；把下面的反例写成正式回归，确认现有实现失败后再修复产品代码。

## 1. 修复正常 space.create 重放（R8-F01 / L01）

真实调用链：SpaceService.createSpace 使用 `spaceId='instance'` 写入幂等记录；reconstructResult 接收该上下文；当前 `case 'space'` 却要求新空间 ID 与字符串 instance 相等，造成所有正常同键重试返回 422。

要求：

- 按已解析 operation 区分实例级 `space.create` 与空间级 `space.patch`，明确授权后的作用域规则。保留 `instance` 的原键语义，不改 actor/key/hash，不换键，不重新执行 action。
- 合法空间创建的同键同负载重试应返回第一次成功结果。空间级操作继续核验目标/记录的 space；不能通过删除所有归属检查解决问题。
- 保留原先的权限检查顺序。同键不同负载保持 409，不同 actor 不继承结果，后续重试不得新增空间、membership、事件或幂等记录。
- 不额外更改其他业务字段的历史语义；发现 R8 已登记的后续问题，记录到对应任务，不把本轮扩成全面重写。

最少正式回归：

1. POST /spaces 首次 201、立即同键重试 201，比较业务 data 完整相等，忽略传输 request_id 等 envelope 字段。
2. 关闭重开文件库并走真实协调启动后，原键重试仍 201、结果一致。
3. 一个“事务成功提交，但成功响应未交付”的受控测试：通过测试响应层故障或等价确定性故障点，确认业务和幂等记录已落盘，再同键重试恢复原结果；比较空间、membership、事件、结果记录数量。不能只把第一次成功响应赋给不用的变量便称响应丢失。
4. space.patch 正常同键重放仍成功，错误空间/目标绑定仍被拒绝；已有 payload 冲突测试可引用有效断言。

## 2. 保证不可重放标记可重复启动（R8-F02 / L02）

当前迁移分支写 `op: operation`（含目标 ID），validator 却比较 `op === parsedOp.family`（不含目标），同一实现产生并提交自己下次拒绝的结果。

要求：

- 写清 unreplayable.op 的唯一规范语义，优先保留与幂等记录实际 operation 的精确绑定。需要兼容已生成的合法旧标记时给出明确转换规则；不能只删除目标后放宽成“同族任意目标都可用”。
- 编码器/迁移生成的不可重放标记在提交前通过同一个正式 validator，包含 op、reason、版本与字段白名单；不能由提前 return 绕过。此处必要的共用 helper 可以重构，但不要顺便重写其他模块。
- 对可确认合法且无法恢复历史的记录，保留业务数据、键和已提交事实。服务可以再次启动，重放该键给出受控 422 RESYNC_REQUIRED，无新增 action/event。
- 对不支持或损坏的输入，第一次迁移就拒绝并原子回滚。不能先提交不合法产物，再在第二次启动失败。
- L02 的旧式输入由当前 codec 接受，不宣称精确对应某个已发布二进制。可以依据有来源的支持规则首次原子拒绝该输入，但还必须提供合法不可重放标记经过重复启动的正例，不能通过拒绝全部历史标记“修好”本项。
- 保留明确 reason 白名单；同步 docs/03、04 与实际注册值，删除未实现 reason 的可用性声明。错误诊断不带旧正文或凭据。

最少正式回归：

1. 复现 L02 的接受—落盘—关闭—重开流程：结果要么首次明确拒绝且库不变，要么首次成功后第二次/第三次启动成功；不允许成功后自锁。
2. 一条符合支持规范、包含目标 operation 的合法 thread 不可重放标记：反复启动成功，同键重试稳定 422；actor/凭据/secret/业务/事件/结果记录无新增。
3. 合法 relation.create 不可重放标记继续工作；未知 op、错误目标、未知 reason、额外正文仍拒绝并保持事务原子性。
4. 完整可恢复旧 Thread、正常新 Thread 和旧完整 Post 继续升级并准确重放，引用 K01/L08 的有效正例，不要通过一律拒绝旧库规避验证。

## 3. 验证与交付边界

开发期只跑相关快测，最后在修改后的源码上运行一次：

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm test:all
node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs
node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs
node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs
node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs
node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs
node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs
node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs
node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs
node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs
node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs
```

本轮小包出口：新增正式回归通过；L01/L02/L08 通过；已有正式测试和 G/H/J/K 无回归。L03–L07 属后续范围，仍失败时必须保留原断言、列出准确失败 ID，并如实报告 R8 脚本 exit 1。相关修复自然带动某个后续子例通过可以如实记录，但不能据此宣布后续整包验收。R4 仅 U05/U06 失败时同样记 exit 1，不改其断言。

若必要的格式变更影响旧夹具，保留旧 observed，说明具体来源冲突并提供同语义正反例，不能降低条件。不要通过删用例、跳过检查、只比较状态码或固定返回错误来满足门禁。

实现记录放到 `docs/reviews/2026-09-29-m0-m1-r8/implementation-r4-b4-1/`，至少保存：

- 实现后的 HEAD、dirty 状态、源码/测试指纹、环境；与审查前 baseline 区分。
- 每条命令、退出码与原始输出；自己未运行的检查明确列出。
- 仅两项缺陷的修复说明、作用域/标记兼容决定、测试触发步骤和实际断言位置。
- 其他已知问题的保留清单、实际剩余 L/U 失败，以及本轮小包完成但整个 R4-B 尚未验收的状态。

同步 README、progress、审查入口和必要契约；历史交付报告保留来源，不把自测写成独立验收。完成后停止并交回审查。下一候选任务为 remaining-work.md 的 R4-B.4-2，先不自动执行。
