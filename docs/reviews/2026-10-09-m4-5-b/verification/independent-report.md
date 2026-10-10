# M4.5-B 独立验收

结论：本包显式 flat/wrapped MCP envelope、默认兼容及固定 Claude 的有限八工具接入可以接受。未发现需修改产品的 P1/P2 反例。完整 M4、Codex native、完整 CLI/profile、真实模型及八工具全部业务分支仍未完成；本结论不能替代这些验收。

独验者只新增 `tests/contracts/m4-mcp-wrapped-independent.test.ts` 和本目录证据；没有修改作者产品/测试/宿主文件。基线为 [baseline.json](baseline.json)，HEAD 保持 `b8dacd56779a007a2e7045b682bca0c036fdfc44`。

## 实际检查与版本

| 检查 | 退出码 | 实际时长 | 证据 |
|---|---:|---:|---|
| `pnpm build` | 0 | 5.214s | [receipt](gates/build.receipt.json) |
| `pnpm typecheck` | 0 | 5.235s | [receipt](gates/typecheck.receipt.json) |
| `pnpm lint` | 0 | 5.412s | [receipt](gates/lint.receipt.json) |
| 默认 `pnpm test`（仅本轮 caffeinate） | 0 | 43.753s | [647 项 / 94 文件完整 stdout](gates/full.stdout)、[stderr](gates/full.stderr)、[receipt](gates/full.receipt.json) |
| 独立 native 定向首次可监听运行 | 0 | 3.314s | [5/5 stdout](gates/independent-loopback.stdout)、[receipt](gates/independent-loopback.receipt.json) |
| 最终独立文件 source noEmit | 0 | 3.943s | [receipt](gates/independent-noemit-fixed.receipt.json) |
| 最终独立文件定向 | 0 | 3.384s | [5/5 stdout](gates/independent-final-guard.stdout)、[receipt](gates/independent-final-guard.receipt.json) |
| 25 个保留探针 | 全部 0 | 命令合计 15.201s；窗口 15.803s | [完整结果](current29-results.json)、[输出核查](current25-output-review.json) |

合成 **current29=29/29**，四实际 gates + 25 探针。#11 使用已批准 M3.4-A.1 adapter，#27 使用已批准 M4.4-B adapter；其余 23 个沿原脚本。没有声称两个被替换的原版此次通过，精确命令见 [manifest](current29-manifest.json)。所有探针完整 stdout 均解析核查，未发现 `passes:false` 或非零失败数；#28 stderr 的 AJV `unknown format date-time ignored` 警告原样保留，因此不借该旧探针宣称 date-time 校验。

默认 full 从 19:21:41 UTC 开始时，新增独立测试尚未加入 fresh-bootstrap 的 nullable-token 类型守卫；该守卫在 full 运行期间加入。full647/94 证明该轮较早 fixture 版本，随后只复验受影响最终文件5/5及 noEmit0。产品 A 四文件始终冻结未变，未以不同 fixture 字节冒称同一次全量。最终测试 hash 与组合证据见 [independent-test-freeze.json](independent-test-freeze.json)。根 package typecheck/lint 实际都是包级 tsc，未涵盖根 tests；新增独立文件另做了上述必要 noEmit。

## 独立真实正反例

五例使用各自私有磁盘 SQLite、真实 Fastify loopback、实际 built MCP 子进程和官方 SDK stdio 客户端。初始化管理凭据只用于创建 fixture；MCP 业务用限定一个空间、read/write 的普通 contributor。HTTP 观察不记录 Authorization，stdio env 只显式传 PATH 和本轮 Detuned 配置；没有宿主模型调用。

1. 未设置 mode、显式 flat 均精确广告原八工具；wrapped 八工具的 `input` 深层 JSON 与完整 canonical 相等，所有约束保留，外层 required/input/additionalProperties 精确。三进程发现均零 HTTP、零 diagnostic session。
2. wrapped 外层缺 input、额外属性、null/array，inner 类型、read/publish union、subscribe allOf 与 nested revision 类型共11个非法输入均固定 `VALIDATION_ERROR`，调用者对象不变。零 HTTP、零 session；默认 flat 也拒绝 wrapped 参数，未静默 fallback。
3. 实际普通成员 wrapped 发帖及一次幂等重放保留 scope 和显式 request key。两次业务 POST 的 key 相同、body 已 unwrap；capabilities/me/session 各一次，DB 仅一帖且 author/space/thread 与实际响应吻合，诊断 session 对应普通身份。
4. 另一个 consumer 的真实 long poll 已进入服务 resource barrier 后取消，HTTP lease 最终降零；独立 pending consumer 的 active_batch_id、双方 ack_seq 和全部所选 consumer 状态不变，ACK 请求为零。随后同 stdio 进程合法 context 仍可用。
5. 三种非法启动 mode 均自然 exit1/signalnull，stdout 空、stderr 固定安全文案；无私有 marker/目录输出、无 HTTP，未通过 kill 当完成。

首次沙盒运行实际 **5/5 因 listen EPERM 失败**，在所有业务前阻断，[stdout](gates/independent-first.stdout)/[stderr](gates/independent-first.stderr) 与 exit1/1.575s 保留，不算产品缺陷。第一次最小 loopback 自动审批在创建进程前超时，工具允许原样重试一次，[审批记录](approval-first.txt) 保留；第二审批成功后的实际运行5/5通过。没有以重跑掩盖产品失败。

新增测试 source noEmit 首次 exit2，唯一诊断是 `bootstrapDatabase(...).adminToken` 类型含 null（[原文](gates/independent-noemit.stdout)）。补私有 fresh fixture 明确非空守卫后 noEmit0、最终5/5；没有修改产品或扩大旧测试类型修复。

## 独立源码与固定宿主审查

`tool-validation.ts` 从唯一 DETUNED_TOOLS 直接派生 wrapper，input 原 schema 未删任何 keyword。完整 outer+inner 经原 SDK AJV validator 成功后才取 `data.input`；非法 mode/参数固定错误。flat 验证 map 保留。`bridge.ts` 工厂先解析显式 option，广告/校验使用同一 mode；校验发生在 session prepare 和业务 call 前，unwrap 后继续用原 binding、dispatcher、AbortSignal、finally、结果与 close。`index.ts` 只在 main 读 mode env，先解析 mode 再读取凭据，导入工厂不启流/读凭据。未发现重复业务 ACL 或跨模式兜底；既有关闭/Session/响应安全回归在全套中通过。这里是实际源码静态审查与行为证据，不声称保存了旧 source 的逐字机械 diff。

独立核 A4 和 B9 freeze 全部 hash 匹配（[integrity](integrity-before-metadata.json)）。Claude 本包实际 installed symlink 仍指向2.1.282，native SHA `fcfd837103965c64de34a6b9b94370d77a347ea71819715a27d5f0ef01775ea4` 与上包已接受 binary 一致；本包三 dist hash 与统一 build 当前文件一致。

只读审查 B 完整 recipe/profile/receipt：network deny 仅放一个 owned loopback；用户 state/Keychains 文件与 mach lookup 均拒，原 HOME 原值、owned TMP/CONFIG、private settings/strict MCP、no-session-persistence 保留。三项真实 guard 为 allowed/EPERM/EPERM；消息只 initialize/status/mcp_call，无 prompt/user/assistant/model/key。原 flat4 的旧证据未改；本包真实 status raw exact8，context/read(space revision1)/publish(note) 成功，HTTP 依次 cap/me/session/context/revision/posts 共6。响应 post.id 与记录 DB oracle 的普通 author/space/thread/revision 一致、count delta1、实际 scoped operation/key 存在、session delta1；outer/inner 失败都精确安全错误且 HTTP 仍6。详见 [只读交叉核验](native-readonly-review.json) 与 [作者实际 receipt](../author/claude/wrapped-receipt.json)。

PID75880 实际 EOF 自然 exit0/signalnull/stderr0，recipe 等 child close 后 finally 关闭 app/DB/temp，receipt 清理标记完整；当前 owned temp 路径确实不存在。首次独立 ps 查询被沙盒 EPERM 后，父仅批准一次最小只读 `pgrep -g 75880`（recipe detached child 的真实 PGID=PID）；该次 [receipt](gates/native-group-readonly.receipt.json) exit1、stdout/stderr 空，确认该进程组无成员，没有重启宿主或枚举全局参数。私有 DB 已按正常清理移除，独验核的是执行期记录 oracle 及其真实 SQL/source，不冒称事后重查该 DB。native 是额外有限宿主验收，未计入647核心测试；内部 control 不是跨版本公共 SDK 认证。

## 保护与限制

基线278 source/config/tests 中仅三个授权 MCP 产品文件改变，新增作者4case文件和独立5case文件，当前280项。旧 review **6342/6342**、SQL/archive4、schema/profile2、lock及 HEAD 全部不变；当前文档仅批准 Claude 模板/共享指南/compatibility 三处变化。build 造成11处 MCP dist 变化（tracked3/untracked8），精确清单见 [integrity](integrity-before-metadata.json)。`git diff --check` exit0。

未安装/改全局配置/读取凭据/调用模型/commit/push/publish。当前 Node26.3.0 的本地结果不冒称 Node22、clean install 或远程CI已验。完整 M4/T20 跨宿主 CLI/profile 与模型认证仍未完成；下一必要任务为已冻结 M5.1-A 认证，其后才是实际 Web UI。
