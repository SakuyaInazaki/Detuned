# M2.3 只读搜索事实单

只读源码/正式测试与docs08/09；未跑产品测试或10万基准，未改冻结产品/测试/规范/旧证据。以下为源码事实及明确推断，不包含另行SQLite官方资料核验，也不把探针当完整搜索验收。

## 范围、入口与现契约

- docs08:50：FTS5、中文1/2/3字、标签/主题过滤、分页、脱敏投影移除。docs09:T05（:13）指定“图”“失败”“零权边”、英文、emoji、FTS符号、LIKE通配符字面结果/限额错误及跨空间隔离。T13（:21）要求脱敏后read/历史/FTS/context等无原文。T06（:14）10万材料/context硬预算、:60负载基准超出有限搜索缺口核对，不在本轮执行。
- HTTP `GET /api/v1/spaces/:space_id/search`，server/routes/search.ts:14–53：q必需非空，kind枚举、tags CSV、thread_id、limit、cursor；未知query/重复scalar与重复tags拒绝。tags空串→[]、CSV逐段trim并丢空段（utils/query.ts:152–180）。未限定tag数量/长度/逗号转义，protocol/SearchQuerySchema:7–15逻辑tags数组String、q1–256、limit1–100默认20、cursor自由String。
- SearchService.search:20–44先refreshContext/observer当前授权，q.trim()及长度1–256；limit clamp1–100，tags/kind/thread传storage。长度用JS UTF-16 `.length`，不是Unicode码点计数。
- client/client.ts:674–690 search返回request<any[]>，tags.join(',')，响应data为SearchResultItem[]；meta.next_cursor服务已有，truncated:false。HTTP search无max_bytes预算参数、无全文分页；每item仅title/summary/tags/snippet及定位，非全文body。OpenAPI:439–454输出200仅描述、参数表未像逻辑schema完整描述q长度；工具forum_search复用逻辑query。

## 实际查询/排序与缺口

SqliteStorage.searchPosts:1237–1335：

1. q.trim().length≥3用FTS MATCH，将整串双引号包成phrase，内部双引号双写；SQL参数绑定，不直接执行用户FTS表达式。查询当前revision JOIN且p.lifecycle='active'。snippet(post_fts,2,'<b>','</b>','...',16)实际第2列为title（列顺序post_id,space_id,title,summary,body,tags），并非body；本包是否要改snippet定位由父决定。
2. 其余长度（包括内部views使用空q）走LIKE当前active revision；q非空时只搜title/summary/body，转义 `%`、`_`、`\` 并ESCAPE。空q仅候选枚举。
3. **tags filters完全没有SQL实现**，虽然三层传到storage；kind/thread_id两分支都有精确WHERE。标签文本已写入FTS(tags.join(' '))，所以长q也可能匹配标签文本，短q不搜索标签字段；这不等于属性tag过滤。父需明确属性tags匹配语义（全部/任一、空[]、重复、大小写/精确元素）。不能用FTS字符串匹配代替精确JSON标签过滤。
4. 两分支均ORDER BY p.id DESC，cursor原样p.id<cursor，limit+1取页并以末项post_id作next_cursor。CryptoIdGenerator（ports/id-generator.ts:8–11）是randomUUID，故当前ID字典序稳定键集但**不是时间倒序或相关性排序**。cursor不绑定space/q/filters，不验证原cursor对象存在、不承诺搜索快照；新插入随机ID/修订改变匹配可能影响跨页集合。父须决定仅保留此有限排序合同还是批准更小的改变，不能自行做排名架构。
5. `.length`按UTF-16决定FTS路径；BMP中文1/2/3字与分支吻合，但emoji混合可在不足3码点时进入“≥3”分支。是否造成空匹配须正式产品反例或官方核验，**本轮未运行，不能伪称已实测**。T05字面符号路径正确性还需产品测试，不凭escaped代码宣称所有情况完成。
6. FTS长分支只按f.space_id限制，正常写入f/p空间一致；短分支p.space_id限制。正常跨space授权与候选隔离已实现；损坏库FTS错归属不应在本包被无限升级为新数据库架构任务。

## 修订/撤回/脱敏现实现

- storage:565新帖写title/summary/body/tags入FTS；:603–619新修订删除旧FTS行再写最新版，所以全文搜只当前版。旧固定revision仍合法read，不由搜索自动漂移来源。
- :625 updatePost redacted删除FTS；createRedaction:1369–1375将全部revision正文/标签/structured置墓碑并删FTS。搜索两分支active过滤，自然不输出withdrawn/redacted。撤回不在updatePost主动删FTS（只redacted删），但查询active条件仍阻止返回；“物理撤回索引移除”是否需要不是现规范明确新增要求。
- M2.2-B knowledge/context与搜索不同入口，已冻结投影不要为M2.3重新设计它们。附件/正式评审及隐私绑定不是本包新范围。

## 现正式测试证据边界

- tests/probes/m0-probes.test.ts:10–27：独立临时FTS表中文“最短路”；:30–72独立普通表“图”“审查”LIKE。这是底层技术探针，**未调用产品searchPosts/HTTP**，不能当作T05完整实现证据。
- tests/integration/m0-m1-r4-b-regression.test.ts:3828–3873 AA01有真实HTTP needle返回1条，并验证不支持FTS配置拒绝；其余Z系列验证tokenizer/UNINDEXED/detail模式完整性，不覆盖中文/字面过滤分页。
- tests/integration/m1-discussion.test.ts:354–360跨空间外人search404。
- tests/contracts/r4-c-contracts.test.ts:249–269重复cursor/tags，:501–513错误kind枚举；r4-c-route-contracts.test.ts:82–88 q空/非法kind/重复tags/未知query、空tags合法和CSV协议。它们检查传输验证，未证明tags影响结果。
- 本次全tests检索未发现产品搜索中文1/2/3、emoji/FTS符号/LIKE字面综合、精确tags过滤、多页无重复与脱敏后两分支无旧词的正式行为矩阵。不能拿旧完整测试通过来填这些缺项，也不修改旧probe/日志。

## 最少父裁决输入

1. tags精确匹配全部还是任一？空[]无筛选与重复标签处理是否保持现兼容CSV，逗号标签本包如何界定？
2. 排序/cursor是否保持现ID DESC的有限键集合同（明确非时间/非快照），还是批准具体小范围改动及兼容旧cursor？
3. 字面q与emoji分支按Unicode码点选择的预期、FTS/LIKE大小写差异和snippet选列是否纳入有限修复；先用新正式反例，不先扩大索引/迁移。
4. 本包验收限产品T05+过滤分页脱敏关键回归，10万负载/T06完整预算由父另定，不把未测性能写成功。

最小涉及文件候选：core search-service、StoragePort/searchPosts与sqlite-storage只读查询、protocol/search及OpenAPI参数文案、server/query传输必要部分、client search静态返回类型；新产品搜索正式测试和合同说明。是否改其中每处由父下一包具体所有权决定；本事实单没有架构取舍或实施授权。
