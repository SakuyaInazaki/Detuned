# focus_thread_id 只读事实与待父冻结点

2026-10-06。本包core产品/tests/docs03/ADR030已冻结，正式10/10与source noEmit通过；本文件仅之后的只读事实，不实现focus、不选择路线，不运行tests/build。

## 现接口与400来源

protocol/search.ts:78–83的ContextQuery只有max_bytes与可选focus_thread_id；后者String描述明确当前不支持。server/routes/spaces.ts:127–141允许该query，parseStringQuery拒空/重复等transport非法值，随后传现ContextService及真实req.id，发送共享compactserializer。client getContext/forum_context、CLI context --focus-thread已有参数传播，help明确不支持，不代表已聚焦。

core/services/context-service.ts:32–40先同snapshot refresh当前身份、space observer/read，再max_bytes校验；任何focus_thread_id!==undefined直接VALIDATION_ERROR400，提示去掉参数读空间上下文。不会查目标thread存在、归属、版本或内容。core直接调用空串也400；HTTP空串先transport400，无效身份仍HTTP认证先验。当前scope不支持的事实有旧m2-context C03与contracts覆盖，后续如改此行为旧断言需逐项父授权，不能把旧拒绝验证删去不留迁移说明。

## 已可复用事实

现context一次同步snapshot包括身份/space ACL、当前规则内容ref与policy_revision、可选材料来源投影、space事件最新seq。退出后Clock签同seq checkpoint（actor/space/purpose），之后不读DB；订阅消费仍空间级，read不ack。预算4096..65536/default12288以真实完整envelope计算；先空optional测inline规则必需，必要则objective/rules整体null+omitted/ref，再按activity→failures→blockers→pins逐尾裁；minimum metadata422与来源状态/null保真现有。

findThreadById、listPostsInThread与新增目录可识别当前thread属于该space及post id/head/lifecycle，但不能直接定义“thread context”材料集合。searchPosts现Port支持thread_id过滤；失败摘要可在DB候选阶段按thread过滤再取limit，而不应空间前5项后再滤造成遗漏。listOpenChallenges现只可按target post/revision过滤，不支持thread过滤，且context先取空间所有再slice(0,10)；不能宣称它已有限thread候选查询。listEventsAfter现仅space/afterSeq/limit；context空间最后5条再public过滤。thread聚焦活动需要明确定义哪些event归属thread，是否lookup post/关系以及有限scan，不以filter最后5条替代完整目标集合。

当前pinned_summaries来自空间修订pinned_refs；summary自身thread与source_refs的跨thread关系可不同。projectSummarySources/projectRelation/projectFailureMaterial现安全历史投影可复用，但不自决定空间pins是否继续保留或按哪个端点归入焦点。固定规则ref/帖子正文续读/新目录只提供材料定位，不自动生成摘要，不调用模型。

## docs03/04/09已经明确与尚未规定

docs03:155–159、docs04:187–191明确本阶段space context快照/checkpoint/真实预算/whole item裁剪、source状态、规则引用降级，以及显式focus400不查thread。docs04路由表有可选focus参数，但实现状态文字优先，不能从规划参数推断当前聚焦成功。

docs09 T06:14要求10万帖子、摘要来源更新、小max_bytes不超实际编码预算、truncated明确、继续读取路径、规则ref、checkpoint无竞态漏新事件；并未冻结focus具体筛选集合/字段。docs01概要优先详情与docs09:60的10万帖/100万事件/20客户端固定负载是剩余规模目标，当前有限页面测试不能填成功。

父仍需最少冻结：

1. focus参数成功语义与thread归属检查/不存在404顺序；thread open/archived可读政策、当前thread元数据是否加入响应/必需字段，以及额外metadata过大422。
2. 空间规则与空间pins是否保留；摘要按自身thread还是来源thread筛，跨thread关系是否按source/target/两者包含，失败与活动的目标候选集合和顺序/上限。不能在空间前N后滤冒充完整有限焦点候选。
3. checkpoint仍space high-water（可继续订阅全部事件）还是产生新的用途/过滤合同；既有空间checkpoint/poll确认状态不可暗改。thread限定上下文不自动意味着thread限定消费者或模型理解。
4. 现ContextPage增加焦点元数据还是加法新DTO/接口；included/omitted规则判别与现裁剪优先级是否继承，工具/CLI成功输出、旧focus400断言和错误迁移范围。
5. 若现Port无适用thread关系/事件候选查询，允许何种窄扩展与预算；先事实证明再由父授权，不自动扩大扫描/DDL/通用上下文框架。本包不实施此扩展。

未发现规范已经给出唯一焦点材料算法，故此处不提出自选架构。完整T06/M2.4/M2与focus/性能仍待父独立范围冻结；旧历史not_run及动态证据保护规则保持。本文件完成停写。
