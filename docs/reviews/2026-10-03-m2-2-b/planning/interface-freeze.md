# M2.2-B 唯一接口冻结结论

2026-10-03，父代理批准 planning/contracts.md 的精确DTO与接线，以下补充为最终裁决。本文件记录批准接口，不代表实施或验收通过。

- 三view名称与HTTP data数组保持；findings仅claim。type判别为claim/failure/question/open_challenge，ViewItemByName/ViewResponseData<N>/VIEW_RESPONSE_DATA_SCHEMAS按草案；原SearchResultItem字段保留。
- nullable material字段与missing_fields；report_kind=author_report、formal_review_status/formal_check_status=not_enabled。failure state无默认。unverified reason缺少/空白/非法→null+missing；provided合法可省reason→null且不列missing。其他合法空数组与未知null不同，不调用新写parser阻断历史读取。
- SourceStatus ref/status/has_newer_revision；active/withdrawn新版Boolean，redacted/unavailable必须Null，不输出目标title/current_revision。缺失/跨space/不可读统一unavailable；真实固定ref不漂移。
- RelationProjection保持扁平source_ref/target_ref/relation_id等；固定双方作者、creator、state/version、status与新版标识。任一redacted端新版必须null，active/withdrawn为Boolean。不可授权/missing/跨space端点过滤整个关系。
- context pin仅当前active同space summary、固定版存在；原has_newer_revision只指摘要自身，source_refs新增独立状态。blocking任一端点redacted，issue/impact均null+missing，不能只处理source。recentfailure不补category/state/attempt默认，public活动过滤由core负责。
- 全部新增sources/relations先进入原result的同一次JSON字节测量，触发原truncated路径；不加无用二次测量、不承诺硬限长或完成M2.4。
- 共享DTO+OpenAPI响应挂接，client仅静态getView/getContext泛型；不引入Fastify response serializer或runtimeclient验证。server/search仅确有编译接线必要才改；无需扩server/spaces所有权。
- Unit B独占protocol/search与必要openapi/index、client getView/getContext、新tests/contracts/m2-knowledge-view-contracts.test.ts、docs04/examples/knowledge-views与implementation/protocol证据；不改core/storage/旧正式tests/旧reviewlogs/SQL/schema/archive/status入口。

先新增正式反例并保存失败，再实现。协调独占build protocol给A；各单元定向测试/类型检查，冻结后父代理安排独立全量验收。原hash/历史重放/写入规则不改，不commit/push，禁用deepseek-brainstorm。

## 批准的纯结构校验补充

core不声明TypeBox依赖，不新增package/lock。protocol导出 `isHistoricalMaterialField(kind:'claim'|'failure',field:string,value:unknown):boolean`（复用基础原schema属性）、`isPostRef(value:unknown):value is PostRef`、`isPostRefArray(value:unknown):value is PostRef[]`（minItems1）。只校验字段/固定引用结构、无变更输入；未知字段/null/missing_fields、非空白与unverified条件、权限/生命周期由core负责，不能用新写parser重验历史库。
