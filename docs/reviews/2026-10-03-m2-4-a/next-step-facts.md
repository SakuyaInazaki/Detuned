# M2.4-B 固定规则引用与正文续读事实输入

2026-10-03。只读事实和待裁决接口备选，未实施/测试/build；M2.4-A最终状态由父独立验收决定。以下不等于已批准下一包，不扩到review/artifact/M3/10万负载。

## 现入口与真实行为

| 入口/文件行 | 已实现 | 缺口/边界 |
|---|---|---|
| StoragePort storage.ts:73；SqliteStorage:261 | getSpaceRevision(spaceId,revision)固定版读取；Space记录current_revision，SpaceRevision已有objective/rules/pinned_refs | server spaces.ts仅GET /spaces列表、PATCH /spaces/:id、context等；没有GET /spaces/:id或固定空间规则修订HTTP入口；client无getSpace。context policy_revision不是内容修订定位ref。 |
| PostService:423–459；server/posts.ts:46–58 | getPost(auth,spaceId,postId,revision?)返回{post,revision}；未指定取current，指定固定版；同space/observer，redacted410、missing404，withdrawn历史可读 | HTTP只白名单revision；cursor/max_bytes是未知query400，没有正文分段。返回完整title/summary/body/tags/structured；没有body offset或续读DTO。 |
| server/threads.ts:67–96；client.ts:548 | thread详情+帖子实体页，limit1..100/default50，cursor传storage，meta.next_cursor | 非正文页：Post实体只有id/space/thread/author/kind/current_revision/lifecycle/time。没有max_bytes、固定thread版本快照或绑定cursor。 |
| SqliteStorage:718–754 | listPostsInThread(threadId,limit=50,cursor)：id>cursor、ID ASC、limit+1，裸末项id | 非时间/相关性，也非快照；所有生命周期实体均列出但不含旧正文。cursor未签名绑定actor/space/thread。 |
| SqliteStorage:680–716；posts修订目录 | revision DESC，裸十进制cursor经parseInt，limit+1；目录带各版完整正文，redacted改墓碑 | 这是修订目录分页，不是正文片段；仍无byte cap。新包不能误用裸revision cursor当绑定正文cursor。 |
| client.ts:775–782 forum_read | post传revision后只返回.data；thread不传工具cursor而用undefined limit/cursor，只返回.data | 工具max_bytes/cursor目前忽略；thread分页meta在工具丢失。review/artifact工具kind虽schema允许，执行分支仅post/thread，其余400；本包不借此开展未批准kind。 |
| CLI index.ts:256–271/context；275–294/search；298–315/read | context传max-bytes/focus-thread；search传q/kind/CSVtags/limit；read支持post revision或thread | 三者均只打印res.data；search无cursor参数/无meta，context无truncated可见；read无cursor/max_bytes。CLI parseInt不是严格字面integer验证（最终HTTP验证），不能宣称其文本输入语义精确。 |

ToolReadParamsSchema tools.ts:25–38仍是宽对象：kind thread/post/artifact/review，revision/cursor/max_bytes1024..65536均optional，additionalProperties=false；未按kind判别参数组合。description:271称分段读取，docs04:63与191称post cursor/max_bytes、固定对象/修订/访问者游标，但真实OpenAPI:269–282只revision，HTTP实现没有cursor/max_bytes。应在下包规划冻结后同步“已实现/规划”界线，不能把这些字段当已有能力。

M2.4-A context成功HTTPcap4096..65536/default12288、同源compactserializer、当前space快照checkpoint和整项截断已落；无source/body continuation cursor（meta.next_cursor=null）。目标/规则必保超限422，无法通过固定ref降级读取。focus任何显式值授权后400；只知道空间上下文，不支持线程focus，也不能把线程正文续读等同focus已完成。

## 可复用机制与待父裁决的有限接口备选

1. **固定规则定位**：既有SpaceRevision读取可复用，无新表/迁移必要。候选`SpaceRevisionRef={space_id,revision}`并提供同space授权固定revision读取；可选择GET /spaces/:id?revision或明确revision子资源。需父决定路由/DTO及context是否带此ref、超限规则如何用ref降级、objective是否仍必保。当前policy_revision不得冒充内容revision。未知/跨space/撤权与当前授权策略需统一。
2. **帖子正文续读**：保留getPost旧完整返回兼容，候选另加有界正文读取方式或仅在显式max_bytes时进入分段DTO；输入候选{revision?,cursor?,max_bytes?}。cursor应绑定actor/space/post/固定revision/位置/用途/exp，复用现TokenSigner/Clock，不能重用搜索purpose或裸ID；需父冻结TTL、精确错误、位置单位（UTF8边界或码点）、metadata与结构化材料预算边界、每段完整envelope是否使用A同源helper。续读不能自动取新版，不能切断Unicode或把截断body伪装完整。
3. **最小工具/CLI接线**：若只post续读，ToolRead用判别schema拒绝不适用参数；thread现metadata页可另明确传cursor/保留meta，是否绑新版cursor需父单独决定，不能顺带改全部列表。CLI context/search保留{data,meta}输出迁移，新增search cursor或read cursor参数均是待批准点，现用户脚本data形状兼容面要说明。

以上是可落地选择点，不是多路线架构或父已冻结方案。不提新review/artifact读取、通知状态机、搜索性能和DDL。

## 潜在正式兼容面与有限反例

- tests/contracts/r4-c-route-contracts.test.ts:73–74对实际thread limit/post revision参数的精确schema比较；新增query/路由必须真实更新catalog/全量集合测试，不能伪造body或改历史probe。
- tests/contracts/cross-interface-contract.test.ts:74–81当前ContextPage形状；client论坛read调用既有.data消费者需要先检索准确callsite再授权，不自动全改。
- tests/contracts/m2-context-contracts.test.ts C01必保大objective422：若B批准固定规则降级需明确哪个仍mandatory，不能泛删422反例。C02/03 source状态与真实HTTPcap保持，A快照/TTL/无副作用回归保留。
- tests/integration/m2-knowledge-views.test.ts V06整pin截断与64K40refs保留；新增规则ref不能改变来源新版/脱敏/历史null含义。
- 新有限验证应覆盖固定space版在规则更新后可定位；正文多段合并精确等于固定旧版（Unicode/转义）、新修订不漂移、撤权/脱敏续读拒绝、过期/错actor/space/post/cursor；实际HTTP字节/metadata大字段失败边界；工具/CLImeta迁移。本轮均未运行，不能写通过。

父需最少裁决：规则ref/路由与降级必保规则、正文接口与分段DTO/预算层级/cursor单位和TTL、thread页是否仅接线或另包、CLI输出迁移范围。方案冻结前产品/正式tests/规范保持不动。
