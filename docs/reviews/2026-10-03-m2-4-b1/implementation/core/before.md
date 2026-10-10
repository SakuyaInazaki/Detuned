# B.1 Unit A before

`pnpm exec vitest run tests/integration/m2-space-revision-read.test.ts`：source alias运行，2/2实质失败，exit1；before.log保存完整日志。未build/修改产品或旧测试。

S01真实旧ContextService读取合法12×400中文rules，max_bytes4096时抛QUERY_TOO_BROAD422/retryablefalse，没有返回固定ref可续读。这是父认可A旧合同，B.1将有意改为引用降级，不把旧A行为追认为缺陷。S02普通context成功，actual rules=first rule/policy_revision1，但没有space_revision_ref或space_content_status；新合同期望明确内容修订定位。新测试正常collect/执行，不引入不存在的SpaceRevisionReadService/helper导入，不用模块错误冒充行为反例。

新增空间有界读取的旧HTTP404反例由B保存。A的真实fixedref+多页重组正式用例待父放行后补齐。旧A before/after证据不改，minmetadata422控制组保留。
