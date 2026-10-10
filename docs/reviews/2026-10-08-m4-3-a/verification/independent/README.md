# M4.3-A 独立验收

状态 PASS。官方源码 5badb15009ae1756c3afe0ae0cef1faafc290ccc、Vitest 4.1.8、真实 Cordis/SystemPrompt/ToolRuntime/createScope/MCP SDK/registry/stdio bridge/HTTP/SQLite。复用作者启动清退样板，自行构建并执行两个case，无作者spec import，无mock或tooldefinition.execute替身。

1. Actor仅spaceA授权；spaceB预建非空secret marker帖子、事件及幂等记录。真实registry spaceA context正例成功；合法schema的spaceB context和publish返回NOT_FOUND，不含marker，B posts/events/idempotency_records计数逐次精确不变。实际八schemas与protocol DETUNED_TOOLS加mcp__detuned__前缀作完整排序exact set比较；完整names见runtime-receipt.json。
2. 同actor/consumer真实registry subscribe、publish和poll取得1事件pending batch。dispose真实scope/root且原bridge全部退出，新scope/bridge使用同credential/consumer重连poll，batch_id及events完整相等，SQLite from_seq=2/through_seq=3/ack_seq=2和active_batch_id精确不变，acked_at仍null；ACK HTTP请求0。cursor允许重签，不比字节。每runtime恰1诊断session、actor与spaceA正确。

实际四次执行：first exit1/0case：spec位于repo无法解析官方包，窄修为复制到source的owned实验目录；second exit1/1pass1fail：重连fixture把subscribe已解包data误当HTTP envelope，未到重连断言；third仅该case exit0/1pass1skip；final exit0/2pass，2.16s。final追加直接写机器receipt，因为官方logging会抑制Vitest console输出，未弱化断言。stdout/stderr与直接工具exit保存，不隐藏首失败。没有产品缺陷。

命令（cwd /private/tmp/detuned-m43-runtime.MU1a4q）：
`DETUNED_EXPERIMENT_REPO=/Users/sakimi/Desktop/Detuned DETUNED_EXPERIMENT_SOURCE=/private/tmp/detuned-m43-runtime.MU1a4q CI=true node /private/tmp/detuned-m43-runtime.MU1a4q/node_modules/vitest/vitest.mjs run --config /private/tmp/detuned-m43-runtime.MU1a4q/.detuned-m43/independent.config.ts`

本机loopback获require_escalated执行。没有网络安装、模型调用、外部账号、全局配置、commit/push/deploy；冻结四文件和产品文件未改。所有私有SQLite/0600 token文件/HTTP fixture目录在finally清退；scope.dispose与ctx.fiber.dispose await，probe/serving PID读取exit记录并kill(pid,0)确认退出。final 6个PID详见receipt。owned /private/tmp spec/config与生成脚本保留以复验；source/deps按要求保留。

未跑615套、current29、完整dsh CLI、HMR、model/provider、root setup或native build。仅此两个独立case可用，不扩大为完整dsh或全产品验收。下一步交主代理父验收。

## 最小环境补验

前四次实际命令使用环境变量前缀，继承exec环境；不可将其描述为allowlist隔离。父验收要求后，以同冻结spec和完全相同断言做第五次 isolated：实际启动命令保存在 isolated-run.sh 第3行，使用 `/usr/bin/env -i`，仅显式 PATH、DETUNED_EXPERIMENT_REPO、DETUNED_EXPERIMENT_SOURCE、CI 四项，不设置HOME/CODEX_HOME、不继承NODE_OPTIONS/proxy/用户token，未读取用户配置或凭据。无需额外cache。真实exit0、2pass、2.24s；stdout现实际打印完整八names、两case receipt及六个PID退出。isolated.stdout.log、isolated.stderr.log、isolated.exit-code和isolated.runtime-receipt.json已保存；旧final机器receipt另保 final.runtime-receipt.json，前四次日志未改。官方bridge env仍仅传fixture自有token文件、loopback base URL与固定PID preload，禁止真实凭据。此补验PASS，所有finally清退断言通过。
