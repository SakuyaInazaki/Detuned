# M2.4-B.1 父代理接口冻结

2026-10-03，以下是唯一批准接口，优先于草案，不是验收结论。

- GET /spaces/:space_id/revisions/:revision，path revision正safeinteger严格解析，不吞后缀；query仅max_bytes/cursor。CONTEXT_BYTES范围4096..65536/default12288。
- encodeSpaceRulesDocument=JSON.stringify({objective,rules})按原值/顺序，重组文档只含这两字段。SpaceRevisionRef={space_id,revision正safeint}。
- SpaceRevisionPage.data={ref,encoding:'json',chunk,start_byte,end_byte,complete}，原compact文档UTF8半开区间，安全字符边界。拼接全部chunk后才JSON.parse。page/envelope完整union：complete=false对应meta.truncated=true+非空next_cursor；complete=true对应false/null。同源build/serialize/bytes helpers计真实req.id/双层转义，route只send共享compact字符串。
- cursor严格v1/purpose:'space_revision_read'/actor_id/space_id/revision/byte_offset/exp，首次24h，后页沿原exp，不绑定预算，最多4096chars。core当前ACL、签名/合法位置/Clock/错误由A负责，B app接线。
- context always space_revision_ref与space_content_status；included保留objective string/rules array；omitted_for_budget两者整体null且meta.truncated=true。schema拒半空/矛盾与omitted+truncatedfalse。先空optional测inline mandatory，over则原完整候选降ref，再按A尾删可选。
- forum_read分支：space={kind,space_id,revision必需,max_bytes?,cursor?}不接受id；post={kind,space_id,id,revision?}；thread={kind,space_id,id}。thread revision/cursor/max_bytes与post cursor/max_bytes禁止。artifact/review删除可发现预览schema，绕过校验仍400未支持。additionalPropertiesfalse、rootobject+anyOf/UnionKind；共享纯结构validator供directclient调用，不复制授权/游标业务。
- CLI新 detuned space read <space-id> --revision <n> [--max-bytes <n>] [--cursor <token>]，严格数值解析，整page输出；如有同名冲突先报。原read post/thread合法输出与search不改；context改整page、help focus明确不支持，输出迁移说明。
- B所有权protocol spaces/search/tools/encoder/OpenAPI、server app/spaces、client/CLI、新m2-space-read-contracts；旧m2-context-contracts只C01降引用/真实重组+C04union，cross-interface/knowledge contracts仅确需included缩窄/ref；其他旧tests先报。docs04/examples实施后同步。A持core/storage及业务测试。
- 本阶段先仅新before：旧大目标422/无ref、新route404、CLIcontext丢meta至少两实质观测，非新helper缺import。无产品/旧tests/build/fullsuite写入，两单元before后父统一实施。不得旧证据覆盖/commit/push/模型/全局配置。
