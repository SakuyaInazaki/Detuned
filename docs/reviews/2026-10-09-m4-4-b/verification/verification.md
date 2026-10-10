# M4.4-B 独立功能验收与统一门禁

执行者：/root/m44_verify。结论：有限 Pi0.87.1 真实 SDK 扩展身份/生命周期路径通过独立验收。最终默认 `pnpm test` exit0，638项/92文件，较627/90基线新增作者5项 + 独验native6项，新增2个测试文件。Vitest43.47秒，实际命令墙钟44.012秒。完整stdout/stderr核对，stderr仅 `$ vitest run`；未按日志尾推断结果。

## 实际检查与版本组合

| 检查 | 实际结果 | 日志前缀 |
|---|---|---|
| 全仓 `pnpm build` 首次 | exit0，A v1 | observed-build |
| native6定向首次 | 6/6，exit0，3.66秒，A v1 | observed-native-targeted |
| 独验新TS test定向noemit | exit0 | observed-native-source-noemit |
| Pi v2增量build | exit0，仅摘要text改动，不重全仓build | observed-adapter-v2-build |
| 全仓 `pnpm typecheck` 首次 | exit0，A v2 | observed-typecheck |
| 全仓 `pnpm lint` 首次 | exit0，A v2 | observed-lint |
| 默认全套首次 | exit1：637通过/1失败，92文件 | observed-fullsuite |
| P07 fixture窄修后默认全套复验 | exit0：638/638、92/92，A/B v2 | observed-fullsuite-p07-fixed |
| 保留原probe #5–26 | 22条命令首次exit0，不重复 | observed-current29-05至26 |
| 保留原probe #27 | exit1，AC01–05通过，AC06缺on | observed-current29-27 |
| 获准#27兼容adapter | exit0，6/6 probe，cap/me/session/context路径已验 | observed-current29-27-adapter |
| 原#28/#29首次 | 各exit0 | observed-current29-28/29 |
| composite current29 | 实际四gates +23原probe +2获准adapter，29/29 | independent-results.json |

每个日志前缀有 `.txt` 与 `.stderr.txt`。完整argv、实际起止时间、exitcode见 commands.json；不是整仓build在同一个v2冻结上重跑。root v1build + adapter v2必要增量build 形成最终built；最终type/lint/full都在A v2，full还含B v2及D具体NOT_FOUND错误原型断言。native无需为了摘要文本重复单独六组，但最终全套自然验证v2全部六组。

第11条明确沿用获准M3.4-A.1 adapter，不宣称原default burst20 probe通过。第27条明确本包新获准adapter，不宣称原档案通过。所有选定25条probe完整stdout JSON与完整stderr均读取；部分历史validator stderr有date-time ignored警告，未删除/冒称全部stderr为空，具体bytes/hashes见independent-results.json。

## 真正native范围

正式资产仅 `tests/contracts/m4-pi-native-lifecycle.test.ts` 与 `tests/fixtures/pi-runtime/native-lifecycle.mjs`。TS父runner使用 `/usr/bin/env -i` + PATH/CI白名单，node使用已安装执行文件；helper独立私有cwd/agentDir/auth.json `{}`、modelsPath:null、allowModelNetwork:false、refreshOnCreate:false、memorysettings、私有SessionManager和完整显式ResourceLoader。没有prompt/stream或模型推理；fork仅私有静态assistant message让官方会话持久化，不冒充模型响应。

实际版本0.87.1。官方内部 `dist/core/extensions/loader.js` 从固定安装包文件URL加载，SHA81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4。此test-only内部入口由父明确授权，不是package公开export，也不是产品依赖路径；不能称全链公开SDK或真实PiCLI/profile认证。

六个child均使用真实SQLite file、真实Fastify loopback、官方extension registry/SDK，不mock Host，不手发lifecycle事件。完整native6 JSON证据见native-first-receipt.json及最终independent-results.json：

- 实际注册恰8工具；activation + startup session_start零HTTP。
- 两个普通contributor身份A/B，没有给插件管理员token。A首次并发两post真实HTTP cap=1/me=1/session=1/posts=2；两帖DBauthor=A，diagnostic session DBactor=A且恰1条。
- 同代tokenfile变B后新post仍authorA；官方new/start轮换后post/diagnostic session=B。无权空间即使credential allowed_space_ids为*仍由服务端membership拒绝，真实DetunedError/404 NOT_FOUND，安全message不含token。
- identity场景另一extension通过真实before-switch veto取消new；无HTTP/无关闭，旧runtime再发帖仍A，随后真实new成功才改B。论坛未用可能veto的beforehook关闭。
- new/switch/fork/reload/shutdown五个官方动作：真实longpoll已进入服务，动作取消后UserAbortError实际类，外层tool finally在官方动作返回前已经完成。独立另一consumer已持久未确认batch，consumer.active_batch_id与ack_seq原值不变，真实ACK request增量0。
- reload真实重新loadExtensionsCached并newactivate，tool对象更换；当前SDK组合没有reload后session_start，但新的空generation可以正常publish为B。旧extension已关闭的stored poll callback拒绝且零HTTP，不能lazy重启；shutdown也证明旧callback零HTTP拒绝。
- 所有child自然exit0，父watchdog没有强杀；helper finally关闭host/app/SQLite并删除自有临时目录。原型或官方dsh已持有资源不被清理。

## 首次失败、有限修正与保留证据

首full失败只在P07：`tests/contracts/m2-post-revision-read-contracts.test.ts:200` 的旧手写API只有registerTool/registerCommand，缺真实ExtensionAPI的on接口。完整stderr恰此一失败；native6、作者unit5、旧R4C26均通过。父扩展B所有权只补P07一行on/unsubscribe注册接口，保原installed Pi validator、真实HTTP与原断言不变；B定向P07 1/1后v2冻结，独验仅full受影响复验，没有重build/type/lint/native。

原#27同类缺fake.on导致AC06报TypeError，AC01–05全通过。旧档案原字节/hash不变；父批准本包adapter只改5个相对import深度、补on接口，并为AC06提供严格合法cap/Me/Session前置后让原business context响应坏JSON。原所有assertions保留，额外断言HTTP四阶段精准为capabilities/me/sessions/context及实际ClientProtocolError，避免preflight失败伪装业务坏JSON。AC01–05原source segment逐字比较不变。精确diff、原/新hash与授权basis见current27-adapter.diff/current27-adapter-basis.json，首失败见current27-original-failure.json。

## 静态审查、额外编译限制与下一步

直接读取并核对作者最终freeze共5项，完成时SHA仍稳定；见independent-final-author-freeze-check.json与independent-static-review.md。固定代client/sharedbinding、自有AbortControllers/calls、同步closed/abort+await真实finally、10s不合作deadline不假完成、typed安全error与宿主details/模型content边界均按冻结方向实现。没有未解决的可行动产品源码问题。

B附加整旧 `r4-c-contracts.test.ts` source noemit真实exit2，独验读取完整22diagnostics，位置3..1312，C03从1509开始，无新增C03行诊断。这里只核位置，未证明全部pre-existing，也不把该额外检查称通过；官方package typecheck按真实命令exit0，不能混为一个结论。source位置证据见compat-auxiliary-typecheck-review.json。

未验PiCLI/profile/RPC/真实模型、四宿主整体和M4–M7完整完成。旧review/archive/SQL/schema/lock/HEAD最终metadata由C独立收尾，本功能验收不代替它。没有安装/新依赖、推送、提交、发布、全局Agent配置修改。下一必要包由父冻结，继续保真实宿主边界。
