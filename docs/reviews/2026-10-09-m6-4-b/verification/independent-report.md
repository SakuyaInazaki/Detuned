# M6.4-B 独立功能与接入验收

当前范围的验证组合通过，供根裁定有限接受；尚未更新当前状态文档或整包封存。结果为九工具/CLI 薄接入及固定官方宿主有限实测，不表示全部 M6/M7、模型研究评估或其他宿主完成。

## 执行结果与版本

最终产品为 A v2 / B v1。A 四项 freeze 与 B 九项 freeze 全匹配；本包真正产品修复仅 DT03 发现的本地凭据变化竞态。修复后第二次串行全工作区 build 成功；后续均为测试契约期望适配，未改产品或重复构建。

| 验证 | 实际结果 | 证据 |
|---|---|---|
| 最终 build | exit 0，10.374s，workspace concurrency 1 | [build-v2](build-v2.json) |
| 项目 typecheck | exit 0，7.993s，workspace concurrency 1 | [typecheck](typecheck-first.json) |
| 项目 lint / schema 同步 | exit 0，7.787s，workspace concurrency 1 | [lint](lint-first.json) |
| 首次完整 core | 816 case / 128 file，811 passed + 5 failed，exit 1，265.298s | [core 首次](core-first.json) |
| 五处旧契约修正后 | 五个完整文件 30/30，exit 0，3.332s；case 数不增 | [定向复验](core-five-corrected.json) |
| 最终 core 组合 | 816 unique / 128 file = 首 811 + 五个失败关闭；不是最终字节一次全套全绿 | [明确组合](core-final-composite.json) |
| current25 | 25/25 首次通过，17.921s；6 原脚本 + 19 既有获准 adapter + 0 新 adapter | [实际来源/命令/SHA](current29-final-selection.json) |
| 新测试源 noEmit | 新 A/B/D 与 Pi wrapper、两 D 期望修正、五旧文件检查均 exit 0 | [gate-summary](gate-summary.json) |
| 固定 Pi 原六生命周期 | 6/6；纳入上述 core，不另加总数 | [首定向完整输出](new-affected-first.stdout.txt) |
| 固定 dsh 官方 lane | 外部 3/3，exit 0，3.713s；不计 core | [dsh](dsh-first.json) |

新三文件含 A4、B3、D6，共 13 case；816 比上一包 803 增 13，128 比 125 增三文件。新增/受影响首次 80 = 新 13 + 十一旧 catalog 文件的 61 + Pi 原六；首 78 passed / 两个 D 夹具期望失败，随后只复验两条并通过。新 13 在首次完整 core 内全部通过。五处后续契约修正中的合法 artifact metadata 正断言落在原 R04 内，未增加 case。四 gate + 25 probe 是 current29 组合，不能再加到 core 数。

每个实际命令的完整 stdout/stderr/exit 已保存并逐份读核；[output-audit](output-audit.json) 绑定完整字节数/SHA。首 core 输出 50,519 字节、stderr 3,150 字节，归因来自完整五条失败而非终端尾部。pnpm 11.7 的 pnpmfiles 依赖状态警告、Web bundle >500 KiB 和 dsh Vite tsconfig paths deprecation 如实保留，未触发安装或为消警告改实现。core 内 schema 故障测试的预期错误输出不能归为 gate 失败。

## 真正独立正反与首失败

- DT01 核九个 flat/wrapped 广告的 canonical 原 schema，保旧八及组合约束；合法样本、错误类型、未知字段/工具/op、create_session 多余 actor/key/metadata、跨层输入和 subscribe 组合在 protocol、shared client、MCP SDK、Pi 层拒绝。实际 HTTP/诊断 Session 增量零，固定安全错误不回显私密 marker。
- DT02 用真实 SQLite/WAL、HTTP 和官方 MCP stdio，普通请求者加两个独立 reviewer 跑 request、固定 snapshot/assignment、request 后显式 forum Session、本人 sealed、全员揭示、finalize/status/decision 与历史 key 重放。显式 Session 与原 detuned-mcp diagnostic Session 不同，缓存未替换；两 actor 才达到名额，取消另一个 collecting 请求，不自动 ACK。
- DT03 首次真实反例：assignment 等待中 setToken(B) 后仍产生一次 Session POST，返回 ClientProtocolError；预期 POST 0 / IDENTITY_CHANGED 未满足。首证据没有 error code，不倒填。根指定 A 唯一源码修复后，原 case 通过：预读期间改凭据 POST 0、IDENTITY_CHANGED；POST 在途改凭据可实际提交一次，但拒绝返回 Session，无自动重试；取消 POST 0 / UserAbortError；合法对照 POST 1 / 正确 actor。见 [首红](dt03-first-finding.json)、[修后](dt03-v2.json)、[A2 精确差分](../author/tools/identity-v2.diff)。
- DT04 实际当前 ACL 先于旧 key；本人只读凭据能读取 assignment 但不能 submit；管理员、非 reviewer、其他 reviewer 不得读取别人 sealed，list 不返回内容。同 actor 第二 Session 不增加 reviewer 名额或任何业务计数。首次预期 409 不符合既有重复 assignment 的实际 VALIDATION_ERROR 400，根批准改该夹具期望；修后安全数字 checkpoint 记录 400，旧首次只存布尔失败，未倒补。
- DT05 新 CLI 进程从私有 persistent request-key 文件恢复意图，真实私有上传重放返回同 artifact，DB artifact/event/key 不增；真实下载完整 SHA/字节，现有输出文件原字节不覆盖。首次把已有目标退出码期望为 2，实际既有 CliSafeError 映射 1；根批准仅修该期望，固定安全错误及无路径/凭据回显、无业务副作用保留。作者 B 三组是 controlled HTTP transport 的 built child 检查，不能替代 D 的 SQLite 业务实证。
- DT06 明确区分实际后端合法 Session 与 controlled transport 换 actor/space/date/503；每次最多一次 POST、坏响应不能伪成功。closed Pi runtime 的合法新工具调用不能懒重启或发 HTTP。

DT04/05 首原源与两处窄 diff 存 [夹具修正](dt04-dt05-fixture-repair.json)。首次新 80 的两失败与完整日志不覆盖。首次完整 core 的五失败来自旧八工具目录/active 契约、现在合法的 artifact metadata 及 canonical 先行错误文案；根授权五文件精确修正，其旧八样本、其他 unknown kind、made=0、HTTP=0、严格参数与固定安全错误均保持。[五文件 diff](core-five-contract-adaptation.diff) 与 [后取 before](supplement-core-five-before-manifest.json) 明确不在原 59 copy，均为首 full 后捕获且 SHA 命中 fresh，不伪称原时点备份。

## 官方固定宿主与边界

Pi 实际安装 0.87.1，内部 loader SHA 81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4；这是根批准的测试 file-URL 内部 loader，非公开 SDK 全链声明。完整 ResourceLoader、private cwd/agentDir、auth {}、models null、禁网络/refresh、memory settings 保持，无 prompt/stream/model/profile。真实官方 new/switch/fork/reload/shutdown 与 veto 仍覆盖 stop/abort/await tool finally、pending batch 不变、ACK 请求不增、关闭后不可重启、reload 新 activation 无 start 可用。第九发现/start HTTP 0，invalid 新工具 prepare 前 HTTP 0；identity 模式真实普通 B reviewer 调用 create_session 和 assignment，DB Session +1、diagnostic 不变、ACK 0。

dsh 使用保留 runtime HEAD 5badb15009ae1756c3afe0ae0cef1faafc290ccc、plugin 0.2.1-alpha.1 / Vitest 4.1.8；两个保留目录及版本/hash 见 [只读 preflight](official-retained-preflight.json)。真实官方 discovery exact9 / HTTP0，两个 scoped actor 原 authored post/key 重放仍单份；普通 B reviewer 的第九工具 execute 新 Session +1 / diagnostic 不变。原 poll 取消、pending 保留与 noACK 均通过。launch/config/preload 原字节未改，未重建官方依赖或下载。

这三条 dsh 是外部官方 lane，不累加 core；Pi 六条原正式 tests 已在 core 数内。没有把 Node 或 SDK 输出冒浏览器执行，也没有 CLI/模型账户或完整宿主 profile 认证声明。

## 差分、保护与资源

[最终 source manifest](final-source-manifest.json) 绑定 A2/B1 和 D20 文件；[integrity](integrity.json) 实核 source 371→374：六产品路径、十六旧正式测试契约/目录、三个官方 fixture 变动，三个新正式测试，未授权变动零。A2/B1 所有项匹配。五份已授权指南（四 existing + 新 review-cli）单列，不称全当前 docs 不变。

旧 10003 review 文件、SQL/archive 七项、schema profiles 两项、HEAD、lock、JCS、旧 Hasher 保持原 SHA；schema/DDL/dependencies 无变动。packages 与 modules dist 都列实际库存：20 变化 + 1 新增 / 1 删除，来自 build-v2。git diff --check exit 0。该保护核发生在未来 metadata 写入前，后续文档审计另做，不覆盖本次事实。

[cleanup](cleanup.json) 记录 D/Pi 已知当前 fixture 前缀空、官方 dsh 八个已记录 PID 全不存在；scope dispose / fiber dispose / CLI close / Pi child exit 与 host/app/DB/temp finally 均完成。没有活动 exec sessions；仅核已知前缀及八个自身 PID，无全机进程扫描。一个 detuned-m43-chain.8lJaUK 目录 birth/mtime 在 10 月 8 日、早于本包 fresh，未读 DB、未删除，不能归为本次 fixture 遗留或声称本包清退。官方 source/deps 两目录按既有决定保留。本轮未使用或管理 VM/Colima、daemon、浏览器、模型、安装、用户全局配置、发布/推送。

下一步由根读此报告裁定有限功能接受，再单一更新当前文档与整封；已批准 C1 task/ownership 只是下一包规划，未实现或验收。本报告与原执行材料此刻停写。
