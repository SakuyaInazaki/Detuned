# M2.2-B Unit B 协议/传输草案（待父代理冻结）

2026-10-03；只读源码核对与规划，无产品/测试修改，无产品执行。已读AGENTS、README、docs00/08/11及03/04/05、M2.2-A next-task/next-step-facts。父代理编排与验收，GPT-6.1子Agent按所有权开发；论坛产品不启动参与者Agent。

## 当前事实与边界

protocol/search.ts只有SearchResultItem、ContextResponseData、三ViewName，没有typed view item；server/search返回data数组，无query筛选。core findings目前proposal+claim，本包按父裁决只claim；proposal仍可原search/thread读取。open-questions目前SearchResultItem与type=open_challenge混合。client getView返回any[]、getContext返回any；改静态泛型不新增业务计算或假称运行时认证。context route位于server/routes/spaces.ts，不是独立context.ts。

所有新的DTO字段在本机新服务响应中必填；已有SearchResultItem字段保留，不换data形状，不用Optional模糊未知事实。未知/缺少/字段类型非法用null+missing_fields；历史读取不调用M2.2-A新写parser、不改数据库。额外stored structured键不输出到专用material，但原材料保留在既有合法读取入口。响应TypeBox对象additionalProperties=false；别把历史缺项null误写为必需的新写string。

## 精确TypeBox草案

以下String/Boolean/Integer/Null均对应TypeBox类型；FixedRef复用PostRefSchema，EvidenceRef复用EvidenceRefSchema，category复用FailureCategorySchema。nullable(T)=Union(T,Null)。除特别列明，字段全必填。

### 引用来源与关系

`SourceStatusSchema`（导出SourceStatus）：

- ref: FixedRef；保留原作者固定定位。
- status: active | withdrawn | redacted | unavailable（判别键status）。
- has_newer_revision: active/withdrawn分支Boolean；redacted/unavailable分支Null。用真正Union对象表达，不允许unavailable+false。

来源DTO不含title、summary、body、author_id、current_revision。active/withdrawn必须已授权、同space、固定revision存在；redacted是当前授权后的墓碑，绝不加载旧内容。missing、跨space、不可读统一unavailable，保留引用但不证明另一space对象存在；新旧不可判断为null。withdrawn不自动等于证据被反驳。

`RelationProjectionSchema`（导出RelationProjection）：

| 字段 | 类型/含义 |
|---|---|
| relation_id | String，原关系id |
| relation_type | supports/challenges/reproduces |
| source_ref / target_ref | FixedRef，原关系固定双方revision，不漂移 |
| creator_id | String，关系创建者 |
| source_author_id / target_author_id | String，已授权同space端点帖子作者，非修订编辑者 |
| state / version | 既有RelationStateSchema / Integer minimum1 |
| source_status / target_status | active/withdrawn/redacted，不输出unavailable关系 |
| source_has_newer_revision / target_has_newer_revision | nullable(Boolean)；redacted为null，其他已核验固定版才Boolean |

保留旧target固定版本并显式target_has_newer_revision；不推导正式批准/独立复现。任一端点missing/跨space/不可读过滤整关系；通过授权的同space红删端点只保留非内容身份/定位/state，不输出issue/impact/body。source/target status与新版Boolean/null用schema分支约束或共享endpoint判别子对象，最终实现须不允许redacted+false冒充检查过新版。A新增listRelationsByTarget(spaceId,targetPostId)只读port，core筛选3类，与此DTO对接。

### 作者材料

`ClaimMaterialSchema`全字段必填：statement nullable(String 1–5000)、assumptions nullable(Array(String max1000))、scope nullable(String 1–1000)、falsification_plan nullable(String 1–2000)、missing_fields Array(enum上述4字段)。必需文本沿用已有非空白判断，但不trim内容。数组按字段整体判断；非法元素导致该字段null并加入missing_fields，不偷偷丢元素后称完整材料。

`FailureMaterialSchema`全字段必填：attempt nullable(String 1–2000)、category nullable(FailureCategorySchema)、assumptions nullable(Array(String max1000))、tested_scope nullable(String 1–1000)、expected/observed/ruled_out nullable(String 1–2000)、evidence_refs nullable(Array(EvidenceRef))、evidence_state nullable(provided|unverified)、evidence_missing_reason nullable(String max1000)、not_ruled_out/retry_when nullable(Array(String max1000))、missing_fields Array(enum以上字段)。

没有counterexample/provided/summary-as-attempt默认。missing_fields只标缺少或不能按字段独立解读的字段；不存在的可省evidence_missing_reason用null，不作为普通provided材料必填缺项；unverified无有效reason时标该字段。数组[]是已知空，和null未知有区别；不依赖新写parser拒绝历史整材料，不把历史provided声明当可读性认证。EvidenceRef只保留作者原固定定位，不附未授权目标标题/版本/物理路径。

`ReportFlagsSchema`共享必填属性：report_kind Literal('author_report')、formal_review_status Literal('not_enabled')、formal_check_status Literal('not_enabled')。M6尚未实现，public review帖子或reproduces数量不得转换成passed/verified/accepted。

### 三view数组类型

保留SearchResultItem原全部字段，通过Type.Object({...SearchResultItemSchema.properties,...})定义：

- `FindingViewItemSchema`: type Literal('claim')，kind Literal('claim')，material ClaimMaterialSchema，relations Array(RelationProjection)，ReportFlags。
- `FailureViewItemSchema`: type Literal('failure')，kind Literal('failure')，material FailureMaterialSchema，relations Array(RelationProjection)，ReportFlags。
- `QuestionViewItemSchema`: type Literal('question')，kind Literal('question')，其余SearchResultItem字段。问题不是研究认证，不加形式验证结论。
- `OpenChallengeViewItemSchema`: type Literal('open_challenge') + RelationProjection所有字段，relation_type Literal('challenges')、state Literal('open')。保留既有type/relation_id/source_ref/target_ref名称。

导出 `ViewItemByName = {findings: FindingViewItem; failures: FailureViewItem; 'open-questions': QuestionViewItem | OpenChallengeViewItem}` 与 `ViewResponseData<N extends ViewName> = ViewItemByName[N][]`；`VIEW_RESPONSE_DATA_SCHEMAS`分别Array(对应schema)。总体ViewResponseDataSchema是三个Array的Union（不是任意混合所有item的Array），HTTP data仍数组，空数组合法。core getView泛型或精确返回联合由A实现，不能靠any断言掩盖实际缺字段。

## ContextResponseData改动

原space_id/slug/objective/rules/policy_revision/recent_activity/checkpoint_token保持。

- pinned_summaries保留ref/title/summary/has_newer_revision Boolean，后者仍仅指摘要自身；新增source_refs nullable(Array(SourceStatus, minItems1))、missing_fields Array(Literal('source_refs'))。只接纳当前active summary、同space、固定pin revision存在；历史非法pin过滤不改stored pins。source_refs缺少/类型不合法整体null+missing_fields，不把没有声明来源冒充已核查空集合；合法声明逐条保留固定ref与status。
- recent_failures保留ref/title；category nullable(FailureCategorySchema)、attempt nullable(String)、tested_scope nullable(String)、evidence_state nullable(provided|unverified)，新增missing_fields（上述4字段枚举）和report_kind='author_report'。不因DTO新增字段把summary回填为attempt。完整failure material与relations在failures view；context保持既有精简用途，不复制全部材料增加预算。
- blocking_objections保留relation_id/source_ref/target_ref，复用OpenChallengeViewItem属性；issue/impact改nullable(String)，增加missing_fields Array(issue|impact)。红删source时两字段null、不回退原SQL或旧summary，仍保留非内容关系定位。即使withdrawn仍保留open state，不能自动解决。
- recent_activity只由当前可见public事件生成，DTO不新增隐含private对象字段。

新增source/relationship/nullable/missing字段在core组装完整response后计入已有同一次JSON字节测量，再触发原truncated路径；按父裁定不新增二次无用测量或硬限长承诺。此DTO不解决现有一次trim后仍超预算的问题；完整envelope限长属于M2.4后续。

## OpenAPI / route / client接线

protocol/search导出所有类型/schema，index现有export *足够。OpenAPI components公开上述DTO，并给GET context的200挂createApiEnvelopeSchema(ContextResponseDataSchema)；GET views的200挂createApiEnvelopeSchema(ViewResponseDataSchema)，description列出按name的数据类型映射，path name仍3枚举，不增路由/query。search普通SearchResultItem响应不改变。

server现view/context handler已经将core data原样放入envelope；没有必要引入Fastify response serializer（会隐式删字段或改变响应，且不解决name到items的业务判断）。本包选择共享DTO+OpenAPI接线，并由新增真实HTTP契约测试用共享schema检查返回值；server/search只有实际编译所需的typed调用接线。无需新增server/spaces所有权，不改变未授权响应或既有合法数据。客户端无需额外运行时校验。

client实际request<T>返回 `Promise<{data:T;meta?:any}>`，所以getView精确采用 `getView<N extends ViewName>(spaceId:string,name:N,opts?):Promise<{data:ViewResponseData<N>;meta?:any}>`，内部request<ViewResponseData<N>>；getContext内部request<ContextResponseData>。不借本包升级全client meta类型。动态ViewName自然得到联合item数组，不新增工具/Pi修改或中间层状态判断。

### 预览调用方迁移说明

findings从proposal+claim纠正为docs03规定的claim；需要proposal的调用方改用既有search(kind=proposal)或thread读取，不能将空findings解释为无候选方案。HTTP data依然数组，新增type可用于open-questions的question/open_challenge判别，禁止假定每项都有title。旧failure字段现在可能null：调用方先判null并展示missing_fields，不能无条件字符串方法、不能回填counterexample/provided或把null视为已验证空材料。pinned source_refs null表示未能解读历史声明，[]不伪装未知；来源unavailable/redacted的新版字段null，不能显示“没有新版”。摘要自身has_newer_revision旧语义保留，source变化使用source_refs状态。M2.2-A写入与历史raw重放没有改动。

## 当前测试适配盘点

只查当前正式tests与相关字段：没有findings包含proposal、failure默认counterexample/provided、非summary pin必须显示的旧正式断言。cross-interface-contract.test.ts:73–80只检查context space/rules/checkpoint；m1-discussion:345/419只检查未授权/撤credential；r2/r3 context用于checkpoint/能力门禁，均不需改断言。r4-c-route-contracts:88–89检查view拒绝query及200，不变。未发现需要父批准修改的旧setup；新正式文件候选 `tests/contracts/m2-knowledge-view-contracts.test.ts`。旧review/probe/log全部不改；若全量后发现不兼容先报告，不放宽新DTO凑绿。

本草案待父Agent冻结精确命名/字段后实施；没有新SQL/schema表、没有M2.3分页/FTS或M6状态机。
