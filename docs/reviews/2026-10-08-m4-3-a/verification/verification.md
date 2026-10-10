# M4.3-A 验收汇总：父已接受（2026-10-09）

接受范围为固定官方SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc` 的 Cordis/SystemPrompt/ToolRuntime/createScope/MCP namespace plugin→真实registry→Detuned built stdio桥→私有HTTP/SQLite无模型链。作者三个case最终3/3、exit0、2.56s；独验由 **/root/dsh_independent** 执行两个case，最终最小环境追加补验2/2、exit0、2.24s。C本代理仅独立来源/安装收据、静审、保护和文档汇总，不能称自己执行这两个case。机器汇总见 [final-results.json](final-results.json)。

五个外部runtime case不计入核心正式测试；最新M4.2-B的615项/88文件/current29保持，本包build/typecheck/lint/fullsuite及25历史probe均未重跑，没有把未跑写pass。

作者真实discovery0HTTP/session/post/ACK、双scope/不同actor registry context+幂等publish各1post，长poll entered屏障取消前后ack_seq/active_batch_id和ACK请求精确不变；随后建立非空pending再dispose保持。scope和root fiber都await清退，最终8个probe/serving PID有exit且kill0拒。见 [作者receipt](../author/official-chain/README.md)。

独验spaceB预建非空marker及posts/events/idempotency；spaceA context正例成功，合法spaceB context/publish NOT_FOUND、不含marker、三项业务计数逐次不变。同actor/consumer真实subscribe/publish/poll获得1事件pending，dispose后新scope/bridge重连同batch/events和from/through/ack，ACK请求0，每runtime恰1正确actor/space诊断session，允许cursor重签。实际八names exact same-set比较并完整记录于 [isolated.runtime-receipt.json](independent/isolated.runtime-receipt.json)。最终6个PID全部退出，临时SQLite/0600token/HTTP fixture已清退。

失败原样保留：安装attempt1 -15因新增>2GiB预算终止，非路线失败；同lock/flags attempt2 0且累计新增约4.36GiB<6GiB。作者discovery首EPERM，授权loopback复跑通过；独验首alias源外不可解析0case、第二subscribe已解包数据误作envelope1pass1fail、第三仅修case1pass1skip、第四2/2，但前四次继承环境。第五env-i明确四变量、原assert不变2/2关闭该证据缺口。不能称全部首次绿或早期allowlist隔离；原日志和各attempt receipt均保留，见 [独验报告](independent/README.md)。没有已确认产品缺陷。

同SHA14208 tracked（14194正规文件+14symlink）及lock原样；主core/deps/SQL/schema/archive/HEAD/dist与5429旧审查材料保护。新增源码仅父授权四runtime脚本；指南/patch/compat及七当前入口为授权doc delta。最终详细保护和链接见 finalization.json。安装目录 `/private/tmp/detuned-m43-runtime.MU1a4q` 与 `/private/tmp/detuned-m43-deps.avgrrqf7` 有意活跃持有供下一包，不写全部owned0。非敏感独验config/spec可保留复跑；所有测试owned桥PID已退。

未认证完整dsh CLI、官方patch加载、HMR、模型/provider、任意第三方plugin或全平台；指南样例字段同固定Config静审对照，不冒称已由官方Loader加载。下一 [M4.3-B任务书](../next-task.md) 补官方patch与配置watch。未使用deepseek-brainstorm技能、未改全局配置或推送。
