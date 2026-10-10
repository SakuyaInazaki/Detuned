# M2.4-C.2 独立验收（2026-10-06）

本机 T06 新会话链、100k 帖/1M 事件数据与唯一 600 秒测量的实质独验已完成；没有发现未关闭产品问题。原负载命令最终 **exit 1 / complete=false / postflight_gate_timeout**，此事实保留。性能窗口与固定 H 消费收束已完整，后验通过同一 DB/签名 secret 重启补完；不称原命令整体全绿，不重跑 600 秒。最终接受由父代理裁定。

## 门禁与来源

[实际命令清单](commands.json)记录 29 项：16 个 exit0、12 个 exit1、1 个主动 SIGINT -2（以 JSON histogram 为准）。这不是旧 current29。新组合 test 最终1/1；统一 build/typecheck/lint/fullsuite 各一次，正式 **334 tests / 36 files**。六次小夹具首失败及全部修正保留在 [自验归因](self-test-attribution.md)。旧 current29 与旧13探针继承 C1 已接受证据，本轮未机械复跑。H-R1 持久真实历史覆盖继续保持。

[完整独立 seed 核查](full-seed-independent-first.json)：100000 posts、997898 revisions、1000000 events、1000 threads/relations、21 actors/20 sessions、零 seed credentials/consumers，931082240B。schema/typed/ref/时间因果/FTS/逻辑指纹与内容哈希由生成方自验和独立核查分列，后者不导入生成器 assertions。v1/v2/v3历史与失败均保留；最终 v3 规则拆分合法，真实空间/归档版本事件因果未伪造为旧 HTTP 数据。

[preflight](full-preflight-first.json)是真 HTTP 59 请求、155223 响应字节。子进程只获得 baseURL/token/space_id/人类 query；ID/ref/内容完全由 HTTP 发现，controller 在子进程退出后才打开 oracle。前后全表指纹相等。预算、固定空间规则/帖子正文分页、搜索 failure→focus→目录→summary 固定 sources 完整重组通过。

## 唯一测量与账本

[独立原始指标](raw-metrics.json)、[独立20消费者账本](full-ledger-v2.json)直接核原 raw 和运行 DB，不把作者摘要当独验：

- 600001.568ms；24000 logical operations，约40.00/s；34782 HTTP，约57.97/s。
- 200:28814、201:4758；成功33572、预期409:267、search limit422:943；意外错误0。943查询上限返回不算搜索成功。
- 普通成功 HTTP p95 **41.580ms**；实际≤3个汉字搜索2851项，1908成功、943上限422；成功 p95 **36.947ms**。分母及成功/全部区别见原始指标。
- 20普通主空间成员，从真实 checkpoint **1000219** 新建 consumer，到固定 H **1004752**，各精确投递并实际确认 **4533** 事件。逐条 id/seq/type/object/revision 与 DB 对照；重复投递一致、ack 对应真实 batch/through_seq，确认范围无遗漏，终点无活跃 batch。后置控制变更不混入 H。
- 每 write 原 actor/session 所有权、固定结果 ref、同 key payload/result replay、冲突无幂等落库、唯一 business revision/event 都核查。原低效 oracle 对每写扫描百万事件被主动终止 -2；[v2](verify-audit-v2.mjs)只一次流式扫描，保留精确 type/object_id/revision 计数（不以 Set 去重），1.787s完成，同一断言语义。
- 所有成功预算响应 raw body 字节≤实际 max_bytes。无重试、无 BUSY/LOCK 错误代码；内部锁等待 **not_observed**。
- 测量599资源样本：server RSS峰239222784B、runner189595648B；seed+runtime合计峰1948945416B、free最低19017236480B、WAL峰6830992B。真实 Mac16,12/10CPU/16GiB，不称2CPU/4GiB受限环境认证。

## 原 postgate 超时与同库后验

原 post 命令 UTC **12:56:44.619→12:57:15.113**，仅30.494s，首次 HTTP ECONNREFUSED。driver 原120s门禁已接近尾部才调度该命令；不能归因为指纹扫描自身超过120s。原 driver 的 monotonic 与墙时锚没有精确同步记录，墙时估算不冒称精确。

重启同 DB 后计时：首 fingerprint17.290s，HTTP journey0.248s，后 fingerprint16.815s；另一条34.059s整组指纹/读链也通过相等断言。两次后验失败是自有 probe：withdraw缺 expected_revision（正确400），以及额外 boundary在已脱敏 source 上期待旧GET200（正确410）。[原日志](observed-full-postflight-resume-first-2026-10-06.stderr.txt)、[第二日志](observed-full-postflight-resume-second-2026-10-06.stderr.txt)与冻结原脚本未覆盖。

v2 controls 在额外 boundary 失败前已完成并通过：普通作者更新来源、同 key exact replay/改payload409、固定旧 source/summary 不变、当前 has_newer、checkpoint订阅→poll/redelivery→实际ack→empty；私有404、缺read403、无效/撤销cred401、mandatory metadata4K422；withdrawn/redacted当前投影、固定内容410、原 stored content_hash保留。该阶段成功 assertions 可由 v2 脚本及随后 boundary 栈位置核实，未虚构完整成功输出文件。

[额外SC06负例最终0](postflight-boundaries-v2.json)：foreign actor checkpoint422、foreign consumer403、foreign/wrong-purpose/tampered cursor400、foreign revision403、当前 private membership404→200→404、当前撤cred401，错误 envelope不含success data。这些是性能窗外真实负例；不以20成员的成功负载推断跨空间零泄漏。临时控制凭据已清除，重启server已关闭。

## D01 与完整性

[D01实测账本](d01-ledger.json)、[独立核查](d01-independent.json)：唯一 demo 首0，A错误proposal、B provided failure、C仅4输入子进程 HTTP 搜索/固定读取后新建正确松弛 proposal，实际 cites A/B两个固定修订，三普通身份不同，DB/账本8事件一致。独核两次误猜不存在评审表的工具错误保留后纠正；不称模型理解、评审通过或数学创新，仅D01步骤1–3。

[稳定门禁窗口](gate-integrity.json)152 source全保持；[终点完整性](integrity.json)154 source仅父授权后加 d01.mjs/run-verified.mjs及 scale README说明改变，其余原source不变。36 currentdocs、5mutable、2915既有不可变证据、4SQL/archive、2schema、208tracked+48untracked dist、HEAD全保持、无删除。新自动wrapper在suite后增加，tiny自验与core独审由另外单元提供，不称334覆盖新增wrapper。旧稳定snapshot从未覆盖。

未运行 Node22、干净安装、远程CI、真实宿主模型、受限2CPU/4GiB、真正long-poll、crash/backup/T12。现有 snapshot race 机制与正式suite沿用，无额外大库WAL并发实验；旧回归继承不冒称本轮执行。证据索引：[coverage.json](coverage.json)、[commands.json](commands.json)、[stable-after-verification.json](stable-after-verification.json)。
