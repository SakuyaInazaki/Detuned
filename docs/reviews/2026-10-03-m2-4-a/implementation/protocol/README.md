# M2.4-A 单元 B 实现与定向自验

2026-10-03。主代理冻结接口后，GPT-6.1-sol子Agent完成协议/HTTP/client/tools单元；当前仅实现自验，待独立统一验收，不写整体验收结论。论坛自身仍不启动参与者Agent。

## 精确改动

- packages/protocol/src/search.ts：ContextPage/Meta/Envelope schema与类型，meta必需、next_cursor只能null；buildContextEnvelope/serializeContextEnvelope/contextEnvelopeBytes三个同源纯函数（compact JSON +TextEncoder UTF8），ContextQuery范围复用CONTEXT_BYTES。
- packages/protocol/src/tools.ts：forum_context参数复用ContextQuery属性、描述明确完整page与focus不支持；openapi.ts挂必需meta的ContextEnvelope，描述成功HTTPbody层级。index原有search wildcard已导出，无额外改动。
- packages/server/src/app.ts：ContextService正常第五Clock注入；routes/spaces.ts传真实req.id预算参数，发送同纯函数compact字符串，typeapplication/json，不裁业务。
- packages/client/src/client.ts：getContext静态Promise<ContextPage>，forum_context返回完整page，不新增runtime client验证。
- 新 [m2-context-contracts.test.ts](../../../../../tests/contracts/m2-context-contracts.test.ts)；获准旧cross-interface三context断言移到.data，旧knowledge-view-contracts静态返回类型改ContextPage，其余原语义保留。
- [docs04](../../../../../docs/04-protocol.md)与 [context示例](../../../../../examples/context.md)：真实body预算、工具迁移、focus显式不支持、CLI只打印data、M2.4-B未完成。

核心快照/材料选择/删减/签名与时钟消费由单元A负责，本单元不复制授权或事实判断。接口见 [freeze](../../planning/interface-freeze.md)。

## before 与最终定向结果

[before.log](before.log) 新正式2条实质失败：合法1500中文objective、max4096实际返回200，compact HTTP正文5058字节；真实client.callTool在40source pin场景丢meta.truncated。没有用新helper缺import当失败。before范围hash [before.json](before.json)当时逐一核对未变，无build/fullsuite。

[最终targeted-final.log](targeted-final.log)：新4条+旧获准contracts2/4，共10/10。新条目：

- C01：必保UTF8材料4096明确422，65536完整成功控制组。
- C02：共用真实工具调用的truncated true/false与完整40sources大预算控制；额外真实truncated=true HTTP成功raw正文≤4096。
- C03：真实app/client正文4096/65536/default预算，onRequest设置真实req.id的Unicode/引号/反斜杠/换行/制表符，raw与同源编码相等；max_bytes非法、重复、focus和未知query400。
- C04：必需meta/null cursor正反例、true/false编码差一字节、shared tools参数、静态ContextPage与OpenAPI。

[types-final.log](types-final.log)定向源码paths tsc通过，包含新/获准旧contracts及protocol/client/server/core/storage依赖；[protocol-build.log](protocol-build.log)独占协议构建通过并通知A消费；[protocol-types.log](protocol-types.log)、[client-types.log](client-types.log)通过。仅协议build，不build全仓。types-first.log一处测试fetch.json unknown的夹具类型错误保留，窄类型说明修正后通过；targeted-first.log原10/10保留。

没有重跑全suite/29/全仓typecheck/lint；等待独立方统一构建与验收。MCPstdio/Pi安装校验器→registered executor真实工具路径由独立验证方执行，主代理已确认其自建50source fixture并要求大预算false控制组；本单元不把尚未取得最终证据的宿主路径填成功，也不把mock当实测。

## 边界与冻结

成功compact HTTP正文cap不包括headers/status、错误正文、prettyJSON或SDK包装。CLI context目前只打印data，不能从其打印读取meta。没有新增固定规则引用/继续材料cursor，完整M2.4仍待B。date-time在结构校验中忽略，不声称值格式验证。真实四宿主/模型、Node22、干净安装、远程CI与大负载未测。

改后冻结hash见 [after.json](after.json)。本单元所有产品/测试/规范停止写入，最终状态索引留主代理独立验收后分配；旧证据/SQL/schema/archive、未授权旧tests保持，无新依赖/commit/push/全局配置/模型调用。
