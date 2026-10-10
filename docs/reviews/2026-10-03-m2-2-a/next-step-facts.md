# M2.2-B：只读事实输入，待父代理裁决

本轮未改产品/测试/规范、未跑测试。保留 findings / failures / open-questions 名称，无新增 summary 路由建议。M2.3 排序分页/中文FTS性能、M2.4 全文预算、M6 正式状态机不在这里。

## 1. 当前响应、依赖与规范

- `core/services/search-service.ts:43–70` getView 返回 `{view:string,items:any[]}`：failures 是当前 active failure 的 SearchResultItem；findings **proposal25 + claim25**，未附支持/异议；open-questions 是 question25 + `{type:'open_challenge',relation_id,source_ref,target_ref}` 异构集合。`server/routes/search.ts:58–72` HTTP仅返回 `data:result.items`，不输出内部view字段且不支持query过滤（未知query拒绝）。
- `protocol/search.ts:18–31` SearchResultItem 只有 post_id/revision/thread_id/kind/title/summary/tags/snippet/created_at；没有typed view item/response schema。ViewName:74–80保留三名称。`protocol/openapi.ts:455–465` 200只有描述，未挂response schema。
- `client/client.ts:690–696` getView返回 request<any[]>；getContext:523–530 返回any。CLI context:264经HTTP client；MCP/Pi forum_context通过client工具分发（client:749），不直接依赖新typed view字段。现有API泛型宽不等于没有响应兼容责任。
- `protocol/search.ts:37–70` ContextResponseData明确 schema：pinned_summaries每项 `{ref,title,summary,has_newer_revision:boolean}`；recent_failures `{ref,title,category,attempt,tested_scope,evidence_state}`（category/state仅string）；blocking_objections `{relation_id,source_ref,target_ref,issue,impact}`。严格object未知键不允许。OpenAPI context:178–188也仅200描述。
- `core/context-service.ts:49–64` pinned_refs读取固定版，要求同space active，**未限制kind=summary**；has_newer_revision仅比较**摘要自身** current_revision>pinned ref.revision，不检查摘要source_refs引用对象的新版本。当前没有来源更新提醒接口/字段，不能误称这个boolean已经完成来源提醒。
- docs03:103–108：findings规范为 **claim及其支持、异议、评审/验证状态**；无人反对不等于正确。failures按分类/范围/证据/路线，reported只作者报告、独立复现由reproduces及来源显示。开放问题question+未解决challenges，归档≠解决。摘要为维护者置顶summary具体版本，引用对象更新须提醒。
- docs04:71为帖子/关系索引视图，表里写筛选但现route不接受query；:93 context摘要引用；:167完整预算属M2.4。docs05:109–117要求正式研究结果标签由专用对象计算，summary/decision文字不绕过；正式M6状态缺失不能借公共关系数量伪造accepted/verified。

## 2. 可复用读取与持久化事实

- StoragePort:96–99 `findPostById(id):Post|null`、`getPostRevision(postId,revision):PostRevision|null`、`listPostsInThread`；:105–116 findRelationByEndpoints、findRelationById、`listOpenChallenges(spaceId,targetPostId?,targetRevision?):Relation[]`、resolution id/version查询。:155–162 `searchPosts(spaceId,q,filters?,limit?,cursor?)`只当前active版本。
- `sqlite-storage.ts:1232–1329` search空q走当前active帖子/revision联接，既有查询可拿公共候选；:815–846 listOpenChallenges只按relation space/type/state及可选目标固定版过滤，**不联接端点生命周期/空间**。没有通用按目标枚举 supports/reproduces/all-relations 的StoragePort接口；findRelationByEndpoints需要已知双方，不能替代未知来源列表。
- `protocol/relations.ts:4–36` 已有 supports/challenges/reproduces 等类型，relation固定source/target revision、creator_id、state/version；source作者/maintainer建立关系（relation-service:59–95）。没有“独立复现完成”boolean或独立性证明，不能仅reproduces数量推导独立验证。
- `post-service.ts:getPost` 保留指定版本读能力，withdrawn仍可读，redacted授权后410；`sqlite-storage.ts:650–660` 历史revision读取按当前post生命周期实施墓碑（title/summary/body '[REDACTED]'、structured{}、hash'redacted'）。因此旧source_refs定位能保留，不能重新读取脱敏前内容或把墓碑当可用证据。
- M2.2-A `typed-write-validation.ts:16–27` 是**新写**固定引用检查，不应拿它重新验证旧数据并阻止旧库读取；view可复用现读取/授权原语而非调用新写validator补历史事实。附件findArtifactById/当前state可读边界仍M2.1合同。
- `space-service.ts:120–179` patchSpace已maintainer授权、保存pinned_refs，置顶变更不推进policy_revision；目前未核验每个pin同space/kind/version。Context自行过滤同space active，不保证合法pin真是summary。
- 现post_revisions.structured包含summary.source_refs / failure.evidence_refs，relations已有方向/版本/作者，space_revisions已有pinned_refs。docs03:108明确是当前表/不可变材料索引，不维护第二真理表。**来源版本比较及关系索引已有持久材料，不显露必须新增表/迁移的事实依据**；若补通用关系读取，仅新增读取接口/SQL不等于DDL迁移。

## 3. 缺项、历史默认与泄漏边界；最少待裁决点

事实缺项：views没有结构化失败材料/reported标签/带来源的supports、challenges、reproduces索引；没有摘要来源更新提示；没有正式评审验证对象投影。`context-service.ts:92–100` 旧failure缺category默认counterexample、缺evidence_state默认provided，attempt回退summary，tested_scope回退空串；这两个默认会把未知旧材料冒充事实，与A保真边界冲突，B应由父决定“缺项”DTO表达，不能默认补证据。

权限风险：views先空间observer授权，search候选仅active公共post；但open challenges可保留withdrawn/redacted端点，其ID及context issue/impact回退目前没有逐端点同space/状态筛选。`context-service.ts:112–116` recent_activity直接映射listEventsAfter，没有在此过滤visibility；M6封存对象尚未实现，B也不能据此宣布私密事件安全。新增关系/来源投影须先当前授权，再仅暴露当前可读材料或明确墓碑定位，不泄漏旧正文/附件storage_key/私密绑定；现post无私有visibility字段，review kind仍非正式公共帖子。

请父代理最少裁决：
1. findings依docs03只claim，还是保留proposal兼容集合并用kind/标签明确区分？三view item的最小统一/异构DTO哪些事实必需，是否维持现HTTP data数组？
2. reported/reproduces/支持异议如何表达固定来源与“未独立验证”；旧缺字段用缺省省略、null或显式unknown等哪种可审查DTO（此处不代选）？
3. pinned summary现has_newer_revision保留摘要自身含义；来源更新提醒的最少新增字段与withdrawn/redacted/missing来源状态怎样表达？合法pin筛选与历史无效pin如何处理？
4. 关系端点不可读时过滤或墓碑定位的边界，以及只显示已有公共事实时正式review/check状态的“尚未实现”表达；不实现M6。

最小涉及文件事实：core search-service/context-service；protocol search.ts（响应DTO）、openapi.ts；StoragePort/sqlite-storage必要关系读取；server routes/search仅若typed接线需要；client泛型若DTO化；新view/context正式测试；docs03/04关联合同。没有新summary route或新表事实要求。
