# M3.1 独立验收（2026-10-06）

父代理已接受本包限定本机可靠消费/有界等待工程范围，未发现未关闭产品问题。不等于整个M3、备份恢复、运维或真实宿主认证完成。

## 实际执行与原始before

[actual commands](commands.json)记录 after **36命令：34 exit0 + 2 exit1**。失败均为新自有SDK probe：fixture相对import错层，以及将共用client用户取消错误误期待原生AbortError；修新版后实际UserAbortError契约和真实SDK链通过，首文件/stdout/stderr未覆盖。阶段1[manifest](phase1-commands.json)另列：旧dist新组合正式before一命令2项实质红，有限候选脚本仅观察（exit0不是产品通过）；不把before混为after全绿。

统一 **build1、typecheck1、lint1、fullsuite1**。实际正式 **354/354，39文件**（原334+core11+contract7+本单元组合2）。新recovery after2/2首绿；**current29 29/29**引用该同一次build，28余项全部新实跑记录，不用旧manifest元数据冒充执行。ADv2实际38 operations/business routes、20body（既有19JSON+1multipart），44条date-time ignored，不构成日期值格式认证。没有机械再旧13探针/600s。

[before-candidates](before-candidates.json)来自合法HTTP空间/主题/帖子/修订，再显式设合法stored review_assignment visibility；首次与pending泄投、Clock2001签发却Date.now2026、已ack真实签名wrong through_seq重复成功（ack_seq未变）、signed wrong purpose/actor/space重复成功。known testsecret签名是受控负例，不是无secret攻击者能伪造HMAC。actual otherconsumer原cursor409已有效，未泛称全绑定缺失。[after](after-candidates.json)逐项为private不返回、注入Clock精确+24h、错误range/bindings409且无游标推进。旧正式R08的未来游标签名未保证使用真实secret，因此本包新组合用实际持久实例secret核重复分支，不删旧覆盖。

## T08 与 D01步骤4

新[formal](../../../../tests/integration/m3-event-recovery.test.ts)及固定server/client/drop-response-proxy[worker](../../../../tests/helpers/m3-event-worker.mjs)使用真实不同进程、临时SQLite、loopback与私有IPC，不以重新构造service冒充重启。

- 普通A错误proposal、普通B手算材料/provided failure、普通C新进程只接url/token/space_id/query；C经HTTP搜索/固定正文发现A/B refs，发布cites两个精确修订的已知松弛修正。C consumer未确认batch时server+C客户端退出并以新PID重启，同batch/event顺序及精确原proposal/failure正文可读。此为D01步骤4材料/未确认事件恢复，不是模型理解、步骤5–7或研究认证。
- 并发真实HTTP两个poll只一个activebatch。代理拿到server ack200后丢客户端响应，DB只读确认已commit；新client同batch重试200/游标单调。真实已知secret改through_seq的重复ack409，DB游标不变。
- 明确stored事件夹具650条（真实所属Post/固定rev、public/private），100匹配截止实际扫描400位置；pending变private后投影99，后续显式ack/重组可见ID无漏无重复。再520私密事件，最多扫描500形成空batch，ack前游标不变。夹具不冒称业务写API生成sealed review。

core11正式另覆盖TTL Clock等号/+1、精确旧四键兼容/strict8键与extra/错scope、过期重poll同batch刷新24h、旧ack单调、128槽429与释放等；其作者scheduler测试不冒独立129真实客户端验证。协议7正式的HTTP/MCP模拟边界与本单元真实默认timer/进程结果分列，未弱化作者E08/E11范围。

## 有限20等待与当前权限

[wait20真实结果](wait20-first.json)、[独立脚本](check-wait20.mjs)：20不同普通actor、独立client进程/consumer，3轮只执行一次；使用pollWithWait未settle Promise的IPC微任务屏障，确保实际等待就绪再事件/取消/关闭，不sleep猜开始。

1. 事件唤醒117.086–132.854ms，20读取无自动ack，20显式确认后追平。
2. 无事件wait800ms，实测807.247–843.375ms、nullbatch、pending0。
3. 就绪后10用户Abort、10仍连接server.close返回503 TEMPORARILY_UNAVAILABLE retryable，41.366–51.951ms；consumer/batch状态不变；新server PID后20均补回新event，仍未自动ack。

等待运行时即时write **4.581ms（n=1）**、read **0.756ms（n=1）**，只证明本次真实写/读未被等待阻塞，不外推p95/吞吐。等待时间含client IPC/HTTP，取消耗时不称截止耗时。两已完成等待轮资源snapshots没有Timeout、pending0；22个自有PID实际全部退出、旧listener拒连，临时DB目录finally移除。

当前read能力403、禁actor401、撤成员404、ACL epoch409，在pending poll与ack均实跑，consumer/batch完整状态快照无变化。等待中撤credential由core定向注入scheduler测，未声称其它每种ACL都在真实等待中逐一变更。[对象空间](object-scope.json)：真实foreign thread/post/relation实体，明确追加引用foreign实体的stored防御事件，主thread过滤下空batch/显式ack推进。不是普通HTTP可产生不一致event的漏洞证明，不泛化为损坏DB安全认证。

## 真SDK入口、完整性与限制

[tools-real](tools-real.json)：本地安装Pi **0.87.1** validator→实际tool.execute→sharedclient→真实core默认wait，用户取消 **UserAbortError**；built MCP dist→真实SDKstdio extra.signal→client→真实core默认wait，取消McpError；两者都实际等待就绪后取消，零batch/零ack。沿当前已核官方与安装版本规划，不冒真实Pi会话/四宿主模型认证。probe首错和实际client错误分类归因保留，未删schema断言或修改产品。

[最终稳定窗口](integrity-final-checks.json)：158source、37currentdocs、5mutable、3190旧不可变证据、4SQL/archive、2schema在验收窗口保持；唯一build正常改变9tracked dist，无新增/删除dist，48untracked保持、HEAD不变。相对fresh154只变授权3产品文件（core event-service/server events/MCP）+新增4test/helper；规范docs03/04/12授权变与events示例新增单列。H-R1材料/生成器、C2 recipe/scale脚本/完整旧证据原字节保持，继承dirty未清理。验收后当前状态文档已由core获准同步；此为post-verification文档delta，不覆盖原stable窗口。

没有公开原始凭据：token只内存/私有IPC，新记录仅status/ref/错误分类；in-memory工具fixture已关闭，正式与wait20自有tmp已清退。最后只读ps仅自身query shell/rg，无m3-worker/MCPdist遗留。source静态独审核事务不跨await、当前auth/epoch醒后重查、range/bindings先于重复成功、signal/preClose/finally收束，未见本范围具体偏差。

未跑Node22、干净安装、远程CI、真实四宿主模型；无第二600s、独立129真实等待/吞吐认证、断电/介质损坏/备份T12。已运行/作者断言/静态推论/未测各项见[coverage](coverage.json)及[映射](../coverage-audit.md)。后续仅父授权文档同步和只读终核，不重复产品执行。
