# Arch Linux 问题处置与验收

本包核对五份 2026-11-03 外部报告，并从修复前提交 `5ff49614` 独立复核可复现边界。修后固定 Arch Linux x86_64、Node 22.19.0、pnpm 11.7.0 的九个后端包 build/typecheck/lint 全部通过；最终独占核心回归一次完整通过 **165 文件、1009/1009 项，0 fail/pending/todo，318.50 秒**。schema6 不变。既有 161 文件、987 项是独立的修复前验收，保留在下文及原机器摘要中，不与新成绩拼接。未开展前端、浏览器、模型推理、全局配置修改或部署；Mac 未运行安装、构建或测试。

## 当前修复与验收

| 问题 | 修复行为与证据 |
|---|---|
| 同值空间政策保存使评审失效 | 原实现通过正常 HTTP 同值 PATCH 即把 policy_revision 从 1 推到 2，ML04 行为失败。现仅四个政策字段实际变化时推进指针；同值及同值政策与置顶混合保持评审 current，真实变化和数组反序照常失效。正常修订、事件、幂等与历史 accepted 保持断言均通过，见契约和 ADR086。 |
| 畸形上游错误进入共享客户端及 Pi 错误显示 | 非 2xx 只采用合法公开错误字段；缺失/未知 code、字段类型错误或显式错误信封不再反射正文和 metadata，保留真实 HTTP 状态、安全回退及原重试/取消规则。合法业务错误、历史缺省字段仍兼容；普通 JSON 与附件非 JSON 路径分别保持，导出严格 guard 不变。 |
| catch-up 停止后仍 ACK | 原 runner 在真实 catch-up poll 完整正文后收到 SIGTERM，仍产生 20 个服务端 ACK 200，20 个 consumer 的 SQLite 确认位置均推进。修后控制器纳入停止信号、同组失败取消并等待全部任务；相同时机真实故障对照的信号后 ACK 发出/提交均为 0，20 个确认位置不增长，原 pending 绑定保持。取消不能撤销已经提交的 ACK，相关正反回归保留此区别。 |
| plain HTTP 半开连接阻塞退出 | 资源数为 0 时，已接受的空 TCP/半 headers 使原 built CLI 耗尽默认 10 秒、SHUTDOWN_FAILED/exit1；正常 keepalive 对照自然 exit0。现业务 finally 后清退本服务空/半解析连接，完整普通响应须完成并 flush；4 项原服务端测试均失败、修后 HTTP 4 项与 TLS 4 项共 8/8 通过。2MiB 完整响应、后随半 pipeline、第二空连接和 drain 中新连接均受控验证；真实 CLI 三类均自然 exit0，约 11 毫秒。TLS、业务 lease 和原 CLI 预算保持，见 ADR087。 |
| 宿主与 controls 将续签游标字节变化误作丢批 | 共用不透明游标比较，严格保留批次及事件，controls 另核持久 from/through 范围并实际 ACK 新凭据。Pi 原 fixture 整对象比较导致的首 focused 88/89 失败保留；修正测试而未改变服务端消费策略。显式 controls 通过注入时钟推进 2000ms，证明游标已续签且实际使用新游标 ACK 到 10001，ACL 404/403/401/401、来源 active/withdrawn/redacted 与关闭全部通过。首次 controls 在 ACK 后因撤回请求缺 expected_revision 得到正确 400；控制器补本次真实修订号后 fresh fixture 全程通过，原失败保留。 |
| 原生验证器可能误计成功 | 修正同帧 JSON 失败与就绪响应竞态；idle 进程退出但残留自有组需要救援时不得计自然退出成功；dsh 诊断 JSON 原子发布，避免读取半份文件。相应受控回归与四宿主无模型验证通过；清退信号、自然退出和强杀分别记录。 |

catch-up 控制器修好后的中间故障对照曾无 ACK 却仍需 SIGKILL 结束 server，不能算正常关闭；它促成上述 plain HTTP 根因复现。最终相同故障对照保留预期 runner exit1、complete=false、failure=SIGTERM，同时 server 实际 close0、无信号、forced=false、success=true、HTTP 在途归零。原 pending 保持不排除取消时已经进入服务端的其他 poll 合法创建待确认批次，不把“取消”写成所有状态回滚。

修后正常 verified smoke 实际完成 400 个逻辑动作、591 次测量 HTTP：586 成功、5 次预期修订冲突、意外错误 0。成功 HTTP p50/p95/p99 为 2.56/6.83/8.02 毫秒；两个只读 gate 与 wrapper 均通过，complete=true、server close0；测量 HTTP 峰值在途为 1，全程峰值 20。本次另行执行独立 ledger/DB audit，exit0，核对 20 个 consumer、591 请求、586 成功、400 操作与 unexpected0，而非仅凭双 gate 推导消费正确。

规模统计按请求或动作开始阶段归属，drain 中完成者保留完整正文耗时；`complete=true` 不单独证明零错误，普通错误另行统计。自动双 gate 默认不执行 controls，亦不替代独立账本审计；上述 controls 为另一次 fresh fixture 显式验证。全部机器证据统一在 [results.json 的 followup](results.json)，未重跑十万帖、百万事件、600 秒容量场景。

首修后 focused 的 14 文件、89 项为 88 通过、1 失败，Pi fixture 的错误游标字节断言单独保留；修后最终相关测试一次通过 15 文件、101/101 项（21.93 秒）。原 policy 行为失败、HTTP 4 项原实现失败、catch-up 错误 ACK、controls 缺参数及中间强杀均在机器摘要中保留，未改记成功。native 基线中两次缺新 helper/export 的失败不算行为反例，真实同帧错误/就绪竞态另有原实现复现。最终 1009/1009 来自一次完整独占运行，而非这些失败与补测的组合。具体收据见 [机器摘要的 followup](results.json)，原顶层历史字段和原 32 文件比较保持；修后直接字节比较覆盖 54 个运行文件，差异为 0，构建产物取自实际 Arch 构建。

当前宿主认证均无模型调用。Codex 0.165.0 的活动取消与 idle 分支分别在 EOF 后 4273/4266 毫秒自然 close0，Claude Code 2.1.312 活动分支为 75 毫秒，均未发 TERM/KILL，九工具、普通身份检查矩阵、取消未 ACK、pending 与资源清退通过。dsh/MCP 0.2.1-rc.2（宿主 Node 26.11.1、后端 Node 22.19.0）真实 CLI 验证九工具、非法参数零 HTTP、业务错误和固定读取，通过诊断插件显式 SIGTERM 请求 launcher 关闭，最终 close0、无信号；不称 EOF 自然退出。本次未重跑下文固定源码的官方编译/HMR 链。

Pi 0.87.1、Node 22.19.0 的真实 offline CLI 只认证扩展命令 forum-status/forum-check 发现、idle 与 EOF close0，不冒充业务工具模型循环。错误传播另用真实官方 runAgentLoop 的三项预定内存流案例，经注册工具与共享客户端证明旧实现反射标记、新实现不反射、合法公开冲突 message 保持；它是无供应商请求的 SDK 测试。Darwin 探针虽共用不透明游标比较，本次未在 Darwin 执行。

本次私有根在复核后已清退：先核对父目录和本次根的 UID、设备/inode、权限与标记，确认无嵌套挂载、自有测试进程剩余为 0，并排除清理控制器祖先，仅删除本次自有根；即时 lstat 与独立 SSH 均为 ENOENT。原始临时日志保留至复核后随该根删除，必要成功/失败收据留在同一 followup；未再次操作既有历史根或用户数据。

已安装和构建的 Linux 副本可串行运行定点验证；完整核心命令见下文：

```sh
CI=true pnpm exec vitest run tests/contracts/scale-run-lifecycle.test.ts --maxWorkers=1 --no-file-parallelism
CI=true pnpm exec vitest run tests/integration/m6-review-material-lifecycle.test.ts tests/integration/m6-review-finalization-independent.test.ts --maxWorkers=1 --no-file-parallelism
CI=true pnpm exec vitest run tests/contracts/server-http-shutdown.test.ts tests/contracts/server-tls.test.ts --maxWorkers=1 --no-file-parallelism
```

## 五份报告的处置

五份用户提供的原始报告保持原样，以下用原文件名标识。五份报告均固定旧提交 `671ad5545cd5b00fbd409758ec46517482ea4aba`；各自不同运行、宿主版本、失败与补测不可拼成一次全绿。

| 原报告 | 问题与处置 |
|---|---|
| Detuned-后端测试报告.md | 整套超过时限与分组全绿分开保留。评审重复身份返回 400、跨空间隐藏返回 404 均符合协议。Codex 目录形状、私有配置及关闭顺序由 Linux 无模型探针覆盖；原始强杀不冒充正常退出。 |
| Detuned-Arch-Linux-功能验收报告-2026-11-03.md | Pi 隔离子进程丢 TMPDIR 由测试夹具保留私有临时目录解决；撤权重放 404、权限 epoch 重同步及游标续签为预期行为。dsh 错误文本需解析业务码，不能只读 structuredContent。清理前的 server_closed:false 不能覆盖后续真实关闭事实。 |
| Detuned 论坛 Arch Linux 测试报告.md | 极简环境 HOME/UID 解析条件与产品区分；测试夹具提供私有 HOME，避免依赖宿主 passwd。CA 链缺失、未就绪请求及工具封装错误保持为测试环境故障，不为它们加入论坛业务能力。Codex 审批配置仅在显式私有配置内处理。 |
| Detuned-Arch-Linux-测试报告-2026-11-03.md | FIFO 拒绝测试改用当前 Node 调用公开构建入口，消除嵌套 pnpm 可执行入口依赖，仍验证真实 FIFO、原操作期限及无目标发布。伪 ACK 返回 409，保持服务端拒绝。规模 smoke 的客户端数与实际 HTTP 在途数分别记录。Pi 工具抛错消息补稳定业务码，保留原异常类型和元数据。 |
| Detuned-Arch-Linux-验收报告.md | 历史十万帖/百万事件/600 秒结果只属于该报告固定环境；本包不重复声称实测。补负载运行器真实 close、强制清退失败和包含响应体的 HTTP 峰值计量。Claude 转接 pathname/CA 与早期未知 404 不作为论坛缺陷；未调用推理服务。 |

## 服务端语义复核

撤销空间成员资格后，以原 token、同键、同正文重放应返回 `404 NOT_FOUND`，不泄露原帖。已有 [请求键恢复测试](../../../tests/integration/m3-request-key-recovery.test.ts) 已覆盖该路径；本包补齐帖子、修订、事件、幂等记录数量零变化与错误不含原帖 ID/正文的断言，不更改业务逻辑。

[消费核心测试](../../../tests/integration/m3-event-core.test.ts) 的 E03/E04 检查伪造范围、用途及跨 consumer ACK 拒绝并不写数据库；E05 用注入时钟证明重投保持批次和事件、续签 24 小时，旧 ACK 不降低位置；E08 检查凭据撤销与 ACL epoch 失效。[协议](../../04-protocol.md) 明确 ACK_INVALID 为 409、重投允许续签、成员权限变更需重同步；不以游标字面相等代替批次/事件/范围绑定。

[封存初评独立测试](../../../tests/integration/m6-review-submissions-independent.test.ts) 已覆盖同一身份换 session 的 `VALIDATION_ERROR`，并与两个合格身份才揭示的正向场景对照。400 不是重复投票成功，亦不应改成 409 以满足错误探针。

## 既有 Arch 验收：161 文件、987 项

Pi 只在工具执行抛错边界把稳定业务码加入宿主保留的 message，未知异常仍脱敏；共享 HTTP/client/core 的错误码与权限规则保持。dsh 实验路径使用平台临时目录，错误码回归必须从实际错误文本或结构化错误中解析。Codex/Claude 的 Linux 探针使用显式二进制、专用 HOME/临时区、普通凭据与真实 MCP 通道，记录关闭和自有 PID，不以目录发现代替工具行为。

本包规模 smoke 实际完成 400 个逻辑动作、591 次测量 HTTP，其中 586 成功、5 次预期 409、意外错误 0；测量阶段峰值在途数为 1，全程峰值 20 包括 setup 等非测量阶段，不能称为测量期间 20 并发压测。成功 HTTP p50/p95/p99 为 2.54/7.23/7.81 毫秒；前后 gate 均通过，服务 close 0、无信号、forced=false，wrapper exit0。该 smoke 不替代历史十万帖/百万事件/600 秒场景。

dsh 分两条独立证据。已安装发行版 dsh/MCP 0.2.1-rc.2 的真实 CLI（宿主 Node 26.11.1、后端 Node 22.19.0）发现精确九工具，非法参数精确 `VALIDATION_ERROR` 且 HTTP 增量 0，无权空间 `NOT_FOUND`，固定修订读取成功。诊断插件发 SIGTERM 请求官方 launcher 关闭，实际 close 0、无信号，服务关闭且自有组消失；这是显式关闭请求，不写成 EOF 自然退出，无模型调用。

固定官方源码 `5badb15009ae1756c3afe0ae0cef1faafc290ccc` 的独立链也实际通过：插件 3/3（3.824 秒）、40 项目 TypeScript 6.0.3 受限编译（4.200 秒）、官方 decorator/tsdown bundle（1.524 秒）、Loader/Include/真实 HMR 3/3（5.080 秒），各进程 exit0。精确九工具含 review、错误解码、非法零 HTTP、普通身份隔离、取消不 ACK、pending 保持、patch 激活与 A→B 真实 HMR 均验证，登记 MCP PID 已退出。未改官方源码或原锁，未做全 workspace 安装；初次缺官方 dev 依赖与 workspace 链接的失败保留，补齐原锁依赖和同源码链接后才通过。不把发行包版本等同该源码 SHA。

Pi 0.87.1 的真实 CLI 在 Node 22.19.0、私有 HOME/TMPDIR、offline RPC 下显式加载 built 扩展，实际 get_commands/get_state 可见 forum-check、forum-status 且空闲，EOF 自然 close 0、无信号。该 CLI 证据不冒充模型工具循环；错误码 message 与生命周期回归另在核心测试中检查。

负载摘要分别保存 HTTP 请求数、成功数、响应体完成前在途峰值及各阶段峰值；20 个逻辑客户端不等于 20 个同时在途 HTTP。`server_close.success` 仅接受真实 close、退出 0、无信号且未强制终止；运行器失败不能产生 complete=true。FIFO 仍走公开 importSpace，未替换为模拟拒绝或缩短业务路径。

本包固定 Arch Linux x86_64、Node 22.19.0、pnpm 11.7.0，私有冻结依赖安装成功，SQLite 3.53.4 开闭探针通过。protocol、core、client、storage-sqlite、module-review、server、cli、mcp、adapter-pi 九包串行 build、typecheck、lint 均 exit0；schema 生成及同步检查随 storage-sqlite 的 build/lint 通过。pnpm 的 pnpmfiles changed 警告保留，未运行全 workspace/Web 构建或新迁移认证。最终独占核心回归实际 exit0，161 文件、987/987 通过，0 fail/pending/todo，Vitest 326.89 秒、外层 327.434 秒；保持单 worker、文件串行、原默认超时与严格断言。TLS 夹具使用私有 CA 配置并显式声明 CA/leaf 用途。前两次整跑均保留失败：首次 336.78 秒为 985/987，两项涉及 Pi 旧 message 契约及 TLS 夹具继承不可见 CA 配置，修正后原两完整文件 30/30 通过；另一次 354.89 秒、161 文件、987 项为 985 通过、2 失败、0 pending/todo，只有 [schema5 维护测试](../../../tests/integration/m6-schema5-maintenance.test.ts) SM501/SM502 超过原 5000 毫秒限制（5729.60/6074.48 毫秒）。随后不改超时或断言，原完整文件 3/3 通过（SM501/502 为 444.06/522.42 毫秒）。该次窗口另有固定 dsh 源码依赖准备，未证明其造成超时；最终独占整跑的 987/987 是一次独立完整成功，不由两次失败与补测拼接。机器摘要统一见 [实测结果](results.json)，不复制原始宿主输出。本包大型验证均在本次私有 Arch 环境执行；Mac 仅进行文档、代码和小型语法检查。

核心回归可在已按 README 完成冻结安装和九包构建的私有 Linux 副本运行：

```sh
CI=true pnpm exec vitest run --maxWorkers=1 --no-file-parallelism \
  --exclude tests/contracts/m6-knowledge-web-input.test.ts \
  --exclude tests/contracts/m6-review-web-input.test.ts
```

Codex 闲置退出与活动取消单独验收。安装版 0.165.0 的 `generate-json-schema` 确认 `thread/unsubscribe {threadId}` 与 `status` 响应；不使用 `thread/archive` 改动持久线程。首次活动分支发现九工具、完成 19 次业务矩阵，但在 EOF 1.5 秒及 TERM 1.5 秒后被 KILL，退出与服务关闭均不能计通过。独立 idle 分支先 unsubscribe，实际状态 `unsubscribed`，最终冻结脚本复跑 EOF 后 4.260 秒自然 close 0、无信号；服务、数据库、两个桥及自有组清退通过。活动分支将 EOF 观察窗口设为 5 秒后，无需 unsubscribe 最终冻结脚本复跑在 4.279 秒自然 close 0、无信号；真实 HTTP poll 已中止、资源归零、未 ACK 批次与事件保持、ACK 增量为 0，服务、数据库、两个桥及组均清退。该窗口小于 25 秒 poll 期限，并以请求实际 aborted 判定取消，未等 poll 自然到期。Claude Code 2.1.312 的同一活动分支最终冻结脚本复跑在 EOF 后 97 毫秒自然 close 0、无信号，取消、未 ACK 和清退同样通过。三项 driver 均 exit0，均未发 TERM/KILL；先前成功对照的 Codex active 4.294 秒、idle 4.300 秒及 Claude active 93 毫秒另保留于机器摘要，不混作最后复跑耗时。

首次探针还误在 `beginClosing()` 之前调用 `RuntimeResources.waitForIdle()`，违反该 API 的前提，导致清理未执行到底；这属于验证器错误。取消阶段现只在有界窗口核对活动资源已归零，最终服务清理才先 beginClosing 再 waitForIdle、app.close、db.close。原失败保留，修正验证器不自动免除宿主退出失败。上述 1.5 秒窗口不足仅由本包对照确认；旧报告中那次正常读取后的 SIGKILL 没有完整退出时序，原因仍未确定，不能据本次对照倒推为相同根因。

清退前已核对本次专有根的所有者、设备与 inode、0700 权限及所有权标记，确认无嵌套挂载、登记测试进程全部结束；仅以不跟随符号链接的方式删除本次根，即时及独立 SSH 检查均为 `ENOENT`，未删除其他路径。清退状态见机器摘要。

## 可用性与限制

核心论坛、HTTP/CLI/MCP、正式独立评审、外部检查回执和无模型 D01 已有工程验证。五份外部报告提供固定 Arch 环境的历史证据；四宿主模型供应商账户、任意版本配置、生产容量与长期运维不因此获得认证。许可证仍未指定，M8 科研增益仍待独立对照；后续前端工作已取消。历史报告与审查归档保持原样。
