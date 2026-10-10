# M4.4-A 独立功能验收与统一门禁

执行者：/root/m44_verify。结论：本包有限共享身份/session与严格响应边界通过独立功能验收。最终默认 `pnpm test` exit 0，627 项 / 90 文件；新增 guard 3 项 + 独验 native 9 项，比615/88基线新增12项/2文件。最终完整 stdout/stderr 均已核对，stderr仅 `$ vitest run`。Vitest时长43.18秒，命令墙钟43.732秒；gate已结束，无需重复运行。

| 实际检查 | 结果 | 证据 |
|---|---|---|
| `pnpm build` 首次 | exit 0 | observed-build.txt / stderr.txt |
| 独验新两文件 source noemit | exit 0 | observed-native-source-noemit.txt / stderr.txt |
| native定向首轮（沙箱） | exit 1，9项均 listen EPERM，未进入产品路径 | observed-native-targeted.txt / stderr.txt |
| native最小loopback权限复验 | exit 0，9/9 | observed-native-targeted-loopback.txt / stderr.txt |
| `pnpm typecheck` 首次 | exit 0 | observed-typecheck.txt / stderr.txt |
| `pnpm lint` 首次 | exit 0 | observed-lint.txt / stderr.txt |
| 默认 `pnpm test` 首轮 | exit 1，核心627/90通过；4外部spec setup失败 | observed-fullsuite.txt / stderr.txt |
| 默认全套仅排除review目录复验 | exit 1，核心627/90通过；2外部spec setup失败 | observed-fullsuite-ci-discovery-fixed.txt / stderr.txt |
| 默认全套最终精确scope修正复验 | exit 0，627/90 | observed-fullsuite-external-scopes-fixed.txt / stderr.txt |
| 25条保留探针 | 25/25命令exit 0 | observed-current29-05至29各stdout/stderr |
| composite current29 | 四实际已通过gates + 25保留probe，29/29 | independent-results.json |

日志完整文件名、实际argv、起止时间及exitcode见 commands.json。build/typecheck/lint和25probe没有因配置窄修重复执行。第11条明确采用获准 `docs/reviews/2026-10-08-m3-4-a1/verification/adapters/check-unfinished-contracts.mjs`，不声明原default burst20 probe通过。

## Native证据

`tests/contracts/m4-runtime-binding-native.test.ts` 使用独验自己的临时file SQLite、真实Fastify loopback服务、真实HTTP响应替换代理、当前build出的MCP stdio子进程和官方MCP SDK Client；没有mock HTTP、存储或session调用。子进程仅接收私有fixture配置，不读取用户凭据。

- 真合法对照：发现8工具时零HTTP，首publish cap=1/me=1/session=1/post=1/ack=0；DB sessions=1/posts=1。
- Me四反例：actor.kind枚举、nested extra、created_at非法日历日期、disabled_at非法date-time。真实upstream成功响应各替换一次；cap=1/me=1/session=0/post=0/ack=0；DB sessions=0/posts=0。代理恢复合法响应后同进程真实成功，证明拒绝发生在实际路径。
- Session四反例：client_name类型、extra、created_at非法日历日期、metadata数组。upstream已提交真实session，替换一次后cap=1/me=1/session=1/post=0/ack=0；DB sessions=1/posts=0。再次调用保持terminal且不新增任何HTTP/DBsession；新MCP进程恢复合法路径后sessions=2/posts=1。
- 8反例均固定结构化error与text error：`TOOL_EXECUTION_ERROR` / `Service response failed protocol validation.`；秘密marker不进入结果，私有token不进入子进程stderr。
- 最终全套仍执行旧MCP五文件27项：session5、schema4、runtime6、independent binding6、independent lifecycle6，覆盖独立singleflight、waiter取消、finally、terminal、close/EOF/信号、晚成功无业务、未确认不ACK。

## 首失败与有限修正

首次native只有sandbox EPERM，是环境条件，不是算法否定；最小loopback执行权限后未改产品/fixture即9/9。失败setup留下的9个本测试唯一前缀临时目录仅按精确时间窗口清理，未读取DB内容，未触及官方dsh持有资源，见 epem-private-fixture-cleanup.json。

首次默认gate完整stderr实际4setup失败 = 两个 `docs/reviews/.../independent.spec.ts` + `scripts/integrations/dsh-runtime/{loader,runtime}.spec.ts`。独验首次简报仅读日志尾而漏列scripts目录，此分类遗漏已明确纠正，不能把首gate改记通过。父先批准B追加review排除，第二次默认gate仍2scripts失败。有限枚举全仓核心目录外恰此4个外部spec后，父再批准只追加明确dsh-runtime目录；根config最终保留公开defaultExclude和原include/alias，追加两个精确外部scope。专用dsh experiment config显式include，未在此重复外部runtime。原v1/v2/v3 freeze与全部失败日志保留；不是作者共享binding或guard产品缺陷。

## 独立源码结论与边界

独验直接审查源并匹配A4+B3+config共8项v3freeze，完成时SHA仍稳定；见 independent-static-review.md、independent-freeze-v3-check.json。guard三个实际date-time位置均独立full检查，其余schema约束保留，无全局format registry或修补输入。client browser边界没有Node/MCP/Pi依赖，MCP立即真实消费共享API，惰性/各空间flight/waiter/finally/关闭不变量保留。没有提取前源字节，故不声称逐字机械等价。

本包未发现未解决的可行动源码问题。最终只验共享基础和MCP路径；未验Pi官方prototype、真实模型、完整四宿主，不能声明M4–M7整体完成。旧review/SQL/schema/lock/archive/HEAD及文档边界最终metadata由C独立负责；本验收不代替该结论。没有新依赖、发布、推送、提交或全局配置变更。下一必要包是M4.4-B Pi官方SDK无模型prototype，按父冻结任务推进。
