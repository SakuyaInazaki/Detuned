# M2.4-C.1 最终独立验证

2026-10-06，本包主题聚焦context的有限本机功能工程证据已完成，交父Agent验收。H-R1三类历史兼容材料已用新的真实旧版本持久来源闭合可重复覆盖；其独立验收由core Agent执行，不把本Agent实施自验或fullsuite称H-R1独立验证。

## 真实门禁与版本

- 本轮唯一fullsuite **333/333 tests、35 files**，见[真实stdout](observed-current29-03-2026-10-06.txt)。新C.1 core9/contracts6与H-R1 7项含在总数，不重复累加；新focus两文件定向真实15/15。
- current29 **29/29**，typecheck/lint exit0。build项引用本轮唯一统一 `pnpm build`。[实际commands](commands.json)、[命令列表](current29-manifest.json)、[逐条coverage](coverage.json)；列表本身不充执行证据。
- C.1独验实际 **49命令：47 exit0 + 2自有probe首失败**，不是产品故障。HTTP首版误用既有投影的id字段（实际relation_id）；tools首版CLI误用位置参数（现命令--space）。首脚本、stdout/stderr保留，只改自有新probe，修正版通过，未弱化业务断言。
- 原13脚本按原路径真实复用：TP4/PR3/SR4/SQ/KV全exit0。旧A unsupported focus400不是current29项，未跑它而填绿；溯源见下节。
- 动态ADv2/AE原脚本未改：**38 operations/38 business routes、20 body=19 JSON+1 multipart、placeholder0**；实际stderr **44条date-time ignored**，不称格式认证。

[三单元freeze核对](freeze-verification.json)通过core7/protocol10/H-R1 v2八路径。fresh baseline→stable-before是获准实现delta；stable-before→after所有源/文档/旧证据保持。新持久DB例外只有 `.gitignore` 中 `!tests/fixtures/history-b8dacd5/legacy.db`，read-only Git status确认可收集，不git add/commit/push。

## C.1 独立行为证据

[HTTP修正版](observed-focus-http-second-2026-10-06.txt)用独立HTTP创建多thread、7个focus failure与8个其它thread failure、12个早期无关challenge与11个相关challenge。focus failures准确id DESC前5而非created_at；challenge过滤在LIMIT前，两端同space、任一端focus、两端focus去重，created_at/id有序前10。另显式stored跨space relation corruption排除，不声称该行是合法历史HTTP。pin Post自身归属focus，stored重复顺序与跨thread固定source ref保留，source更新/withdrawn/redacted安全状态通过。

活动预期由独立JS对原events/posts/relations行按合同归属计算，不调用开发者新查询当预期。其它thread/public、private focus、review/artifact/space干扰排除，最新5后seq ASC与显式seq上界通过；checkpoint仍绑定space high-water。当前匿名/撤凭据401、无read403、无成员/unknown/foreign404、空/白/重复/unknown400，无读写；archived focus当前完整metadata、省略focus无key。

真实HTTP rawbody与完整compact serializer一致，包括Unicode/request_id二次转义。大规则降ref省略保focus；必要metadata在1632个真实request_id引号时4095 bytes，下一引号422，巨大focus title422且不删focus。该stored边界fixture只用于读取预算，不声称恢复写入前字符或改变写validator。

[预算优先级专项](observed-focus-budget-first-2026-10-06.txt)：独立合同预期对整个数组项尾裁，4K实际3879bytes，activity0/failure0/objection3/pin1；12K/64K全选11553bytes，5/5/10/1。保留focus metadata、space ref与checkpoint，truncated只预算裁剪，next_cursor null，全库读取指纹保持。

[WAL专项](observed-focus-wal-first-2026-10-06.txt)真实双连接在旧focus Thread读后writer并发改Thread metadata、failure head/material、rules revision与seq。首响应全旧snapshot/checkpoint seq4，下一响应全当前/seq5，非跨页固定集合；读无附写。旧SR双WAL/context checkpoint接续poll回归实际通过，沿空间checkpoint合同而非新thread消费者。

[tools修正版](observed-focus-tools-second-2026-10-06.txt)真实安装Pi0.87.1 validator→executor、MCPstdio、HTTP client与CLI --focus-thread和省略focus两链，完整Page metadata、8工具、非法参数及numeric/blank退出2通过。对本次真实emitted UTC ISO毫秒日期作Date.parse/toISOString严格核查，再局部登记date-time并finally恢复registry，完整schema断言保留；不是四真实宿主模型实测/认证。

## H-R1 持久历史兼容恢复

[core独立报告](history-independent-review.md)、[实际独立结果](history-independent-http.json)与独立command/stdout/stderr记首跑exit0：真实旧b8dacd5内部code、192导出files/6内部ESM解析严格隔离，当前外部已装依赖与Node26.3.0环境有记录，不能说完全复原当年环境。旧服务真实3×201记录新provenance，三原payload request_hash与公开原记录一致，actual IDs/ref来自新生成。

归档[legacy DB](../../../../tests/fixtures/history-b8dacd5/legacy.db)无credentials/token_secret，关闭检查点后VACUUM与已知token/secret/hash扫描通过，业务/event/idempotency行不变；生成自己的临时树finally删除。普通formal仅依赖持久DB/expected/provenance/当前安装，不依赖Git、网络或旧/tmp/token。新临时DB同actor随机运行凭据/secret是明确setup，不改历史业务。

独立probe核三旧key201、精确固定revision/body/structured/raw hash/ref/editor/time与仅明确head动态字段；新key更严400，revision原expected先stale409、仅当前expected后仍badstructured400；同key改body409；真正新Node子进程重启；撤权401；三墓碑固定ref与raw stored hash保持；全库全部非系统表指纹无附写。该材料工作缺口已闭合，原M2.1 capture记录原字节保留，新的真实来源不等同找回原DB。

H-R1实施自验独立另册12命令（4 exit0/8首fixture或类型失败），最终7/7/noEmit0，首记录见[实施说明](../implementation/history/README.md)。这12不混进C.1 49独验命令，也不把core独立probe累计为7项之外formal数量。

## 来源迁移、完整性与限制

原A check-context-http.mjs missing focus400→当前404是父批准C.1语义迁移；其巨规则422→ref重组是已批准B.1语义迁移。旧原probe/evidence不改，没有宣称其原断言全绿；本轮新focus证据与原SR4分别核404/ref/mandatory422/预算/来源/WAL。本轮迁移旧formal仅两获准文件，hash delta列清，旧证据保护。

[完整性](integrity.json)：稳定验收窗口**138source/config/tests（含新generator与五fixture文件）、36currentdocs、5mutable、2677既有不可变证据、4SQL/archive、2schema**全零改变/新增/删除；HEAD仍b8dacd56779a007a2e7045b682bca0c036fdfc44。持久DB/expected/provenance/recipe的单独hash保持。唯一构建26 tracked dist改变，208tracked+48untracked，无新/删dist。获准source/docs变化及ignore例外见[只读delta](readonly-delta-audit.json)、[初→冻delta](implementation-delta.json)、[源审计](readonly-audit.md)。

未运行Node22、干净安装、远程CI、四真实宿主模型会话/认证、100k/长时间负载。SQL LIMIT/输出预算不承诺SQL VM或CPU硬cap；pins/source数组无cap仍待规模实测。候选5/10不是完整历史；focus不增加context分页cursor；HTTP正文cap不含headers/errors/SDK/pretty CLI包装。完整M2/T06及后续里程碑仍需父另行规划验收。
