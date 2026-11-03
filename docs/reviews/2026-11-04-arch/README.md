# Arch Linux 问题处置与验收

本包核对 2026-11-03 的五份 Arch 报告，修正可复现的接入与测试工具问题，并保留既有服务端权限、消费和评审语义。本包最终独占核心回归一次通过 161 文件、987 项，失败、pending、todo 均为 0。未开展前端、浏览器、模型推理、全局配置修改或部署。

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

## 变更与验证

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
