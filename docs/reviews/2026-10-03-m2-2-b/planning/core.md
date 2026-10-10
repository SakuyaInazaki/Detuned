# M2.2-B Unit A 开工核实与接线规划（待父批准）

仅新增本规划；未改产品/测试，未运行测试。已读取AGENTS/README/docs00/08/11、docs03/04/05及上包next-task/事实单。上一包M2.2-A结论保持。DTO需与单元B冻结后实施，本文件不代父代理最终决定。

## 已核实事实及最小读取接口

SearchService:getView（search-service.ts:43）当前 findings分别proposal25/claim25、failures50、question25；view没有query过滤，HTTP data数组。按父裁定findings只claim，建议保持claim25既有候选上限，不将排序分页变更引入B。现searchPosts返回current active版固定SearchResultItem，满足主材料候选读取；逐项findPostById/getPostRevision取材料，不改FTS。

StoragePort:105–116能按完整端点查询单关系、列open challenges，但不能枚举未知来源supports/reproduces。建议唯一新增：

```ts
listRelationsByTarget(spaceId: string, targetPostId: string): Relation[];
```

实现只读 `SELECT * FROM relations WHERE space_id=? AND target_post_id=? ORDER BY created_at ASC,id ASC`；**不限制target_revision**，保留旧版关系以标示，类型在core只取supports/challenges/reproduces；不新增limit/cursor分页合同。接口返回原Relation全部固定版本/作者/state字段，复用现row映射。open-questions仍listOpenChallenges(spaceId)，共享core端点检查后输出；不修改其原查询签名/存储状态。不新增DDL/索引/迁移。

## Core helper职责与具体接线建议

新services/knowledge-projection.ts，只处理只读投影，不写状态/事件/hash，不调用typed-write-validation新写validator。

- 服务入口refreshContext→requireSpaceAccess(observer)，全局401/403/404原策略保持，不catch吞掉身份异常。
- `projectPostSource(storage,spaceId,rawRef)`：先核验严格PostRef shape（未知键/错误类型/空id/非法revision判历史无效，不抛整context）；同space实体+固定revision存在。返回协议SourceStatus DTO。跨space/不存在/错误版本统一unavailable，current版本与新旧比较null；同spaceredacted只墓碑状态、无内容；withdrawn固定版允许定位。新旧只对已可读有效实体比较current_revision>ref.revision。
- `projectRelation(storage,spaceId,relation)`：两端必须同space+固定revision存在，否则过滤；redacted保留授权同space墓碑定位与非内容状态，不读/输出原issue或impact。输出固定refs、source/target作者ID、creator_id、state/version、各端状态/新旧关系（精确命名等B冻结）；withdrawn不自动resolved。
- `projectMaterial(kind,structured)`：按**既有基础字段schema逐字段**检查类型/枚举/长度，合法值原样保留，缺失或非法→null+missing_fields；未知历史额外键不导致整对象拒绝，不用A新写schema整体parse。claim读statement/assumptions/scope/falsification_plan；failure读attempt/category/assumptions/tested_scope/expected/observed/evidence_refs/evidence_state/evidence_missing_reason/ruled_out/not_ruled_out/retry_when。不自动填summary为attempt、不补counterexample/provided；空数组按原schema仍合法。optional reason缺省是否列missing_fields须DTO批准明确，建议缺省null但仅unverified缺失时列缺项，避免把合法provided可选省略误标非法。
- 历史引用数组若整体不是合法EvidenceRef/PostRef数组，field→null且列缺项，不丢坏元素再假装完整；摘要source_refs坏shape同理。合法shape引用可投影unavailable，不把引用状态混同材料shape缺项。
- SearchService各view在原search字段上接入typed判别、reported材料/关系（B定字段）；claim/failure不模拟正式认证。getView服务内部仍{view,items}，HTTP仍data数组。
- ContextService pins过滤同space active summary且固定revision存在；异常旧pin逐项过滤不写pins。has_newer_revision保持摘要自身；source状态复用helper。recent_failures复用字段投影，category/state/attempt等缺项null，绝不回退summary。blocking_objections复用relation检查；redacted源issue/impact为null、不回退SQL正文，DTO对应nullable由B冻结。recent_activity先filter visibility==='public'再映射；不为补足5条新建事件扫描语义。

## 当前预算真实边界与有限新增接线

context-service.ts:125–139在组装后只对**data** JSON.UTF8计一次字节；超限设truncated，清空activity并failure截到2条，**未再次测量、未修剪pins/objections，所以不能保证最终≤max_bytes**。server context路由另加envelope，现core计量不预留其字节；focus_thread_id当前未参与选择。HTTP共享query校验4096–65536/default12288；不把现限制声称完整M2.4。

本包来源/关系先加入result，再参与同一Buffer.byteLength(JSON.stringify(result),'utf8')计量。建议有限接线：保留现优先级与一次截断策略，但截断后再次计量供测试/证据注明；新增字段不会游离预算外。不重做全文分段/checkpoint/完整envelope硬限长。**需父裁决**：若B验收要求最终data必须≤max_bytes，则需明确批准小范围整条目降级/删除顺序（activity→recent failures→blocking→pins，保留核心规则与checkpoint），仍可能核心目标/rules本身超限；不能悄悄承诺硬预算或借此实现M2.4。DTO状态不能为省字节改null/false事实。

## 旧正式测试核实

rg全tests未发现findings含proposal、pinned has_newer_revision、历史counterexample/provided或budget最终长度旧断言，因此当前**没有已确认需修改旧正式测试的位置**。

- tests/contracts/cross-interface-contract.test.ts:72–81 forum_context max_bytes8192只断space/rules/checkpoint，无DTO默认断言，预计保持。
- tests/contracts/r4-c-route-contracts.test.ts:61校验max_bytes边界，不改范围/default，预计保持。
- tests/integration/m1-discussion.test.ts:345–352 outsider context404、:419–425撤销token401，新增投影须保持。
- M2.1/M2.2-A新正式写/历史测试不改；新B业务测试应独占tests/integration/m2-knowledge-views.test.ts。若实现时出现旧合法setup冲突，先给父具体反例再改。

## 待冻结点与有限验收

与B协商精确DTO：typed判别+原search字段，材料nullable+missing_fields、reported与review/check not_enabled；RelationProjection固定端点身份/state及旧目标版本标示；SourceStatus状态active/withdrawn/redacted/unavailable和has_newer_revision boolean|null。unknown历史ref是否原样输出不可信对象？建议**不原样输出未知键对象**，source_refs字段null+missing_fields，否则会泄漏未知扩展；合法固定ref保留。B反馈后父冻结具体字段/可选性，A才实施。

有限测试：只claim/三view材料；四个关系类型中仅三类投影及旧目标版不漂移；historicalnull/缺项；合法/坏pin过滤；摘要自己vs来源新版；withdrawn/redacted/crossspace/unavailable；事件public过滤；新增字段计入字节测量与现query边界；既有附件/新写/旧重放回归。M2.3/M2.4完整预算/M6不作为B拒收项。

未来文件所有权候选：core search/context/newhelper、ports/storage及sqlite-storage只读方法、新业务测试、docs03/ADR。父批准后在新implementation目录存before/after与真实runtime；本阶段无实现或运行证据。

### 单元B已对齐的DTO草案（仍待父冻结）

B反馈 SourceStatus `{ref,status:'active'|'withdrawn'|'redacted'|'unavailable',has_newer_revision:boolean|null}`；redacted/unavailable新版比较null，无title/current_revision。RelationProjection保留relation_id/source_ref/target_ref，添加relation_type（3类）、state/version/creator_id/source_author_id/target_author_id/source_status/target_status/source_has_newer_revision/target_has_newer_revision；不可授权端点过滤。view type=claim|failure|question|open_challenge，前三保留SearchResultItem；claim/failure加report_kind=author_report、formal_review_status/formal_check_status=not_enabled、material与relations。context recentfailure原材料字段nullable并加missing_fields/report_kind；pin增加source_refs:null|SourceStatus[]、missing_fields。与A只读投影可直接接线，精确字段表由B提交父冻结。
