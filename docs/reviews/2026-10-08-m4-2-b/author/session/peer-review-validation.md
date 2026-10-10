# A → B 校验模块只读互审

有限范围无新增可行动阻断；不等同所有宿主/schema兼容已认证。未运行B测试或build。

- `packages/mcp/src/tool-validation.ts:13–16` 从DETUNED_TOOLS、MeResponseSchema、SessionSchema编译同一默认SDK provider；没有复制工具字段或引入SDK到protocol/client。
- `tool-validation.ts:7–11` sdkSchema仅可信schema的类型桥，保实际schema对象/keywords；没有对未验证args/result作cast。`validateMcpToolArguments:19–23` unknown/invalid固定VALIDATION_ERROR，不回显provider.errorMessage；成功直接返回validated.data原引用。
- 安装SDK `dist/esm/validation/ajv-provider.js:5–15,64–90` 默认strict=false、validateFormats=true、validateSchema=false、allErrors=true，添加formats；未启coerceTypes/removeAdditional/useDefaults；返回data=input。B实际用默认构造，没有覆盖这些选项。
- `tool-validation.ts:25–32` Me/Session用现完整schema，失败ClientProtocolError固定文字，沿bridge安全renderer；date-time由SDK既有formats处理，非本包自造规则。
- `protocol/src/tools.ts:39,173` 广告联合实际anyOf与subscribe共享allOf保持。新正式 `m4-mcp-schema.test.ts` 核八代表输入/原引用、未知/nested/type、anyOf分支/allOf、legacy structured和响应错误；没有把不存在oneOf keyword写成已验。
- `docs/04-protocol.md:383–389` 与 `examples/mcp-bridge.md:19–31` 区分runtime诊断关联与逐帖审计，说明新显式call可重试global而session已开始失败缓存到重连；没有新增session_id广告或无害记录回滚承诺。

B6文件manifest逐项SHA比对一致（本次只读核对）。A本包产品保持冻结。
