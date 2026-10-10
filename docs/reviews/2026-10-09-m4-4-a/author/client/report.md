# A：M4.4-A shared binding提取

四产品文件hash见freeze-manifest.json，已停写。准确MCP目录为packages/mcp/src，未创建mcp-bridge目录。

client新增createRuntimeSessionBinding/RuntimeSessionBindingOptions/RuntimeSessionBinding，完整保留旧flight算法：global成功cache/失败真实finally后clear；per-space createSession一旦started失败terminal；waiter引用计数、lastwaiterabort、closing/pending realfinally均原样。返回prepare/beginClosing/waitForIdle明确type。依赖仅client.js错误/type与protocol两个pureguards，不引Node/MCP/Pi或新依赖到browser。

MCP旧McpSessionBinding/createSessionBinding保持签名、成为thinwrapper实际调用shared入口。tool-validation仅原Me/Session parser换B的isMeResponse/isSession，固定ClientProtocolError文字保持；SDK Ajv八tool provider、原schema对象与输入判定不动。sharedparser也复用相同guard与原错误文字，无各自复制字段/date规则。凭据、request/retry与core业务未改。

未新增镜像测试：现tests/contracts/m4-mcp-session.test.ts五组负责singleflight/global重试/started session terminal/身份空间核/关闭finally等已验行为。

真实检查顺序：
1. source-first实际exit1、5失败：复用历史source-vitest局部alias把当前base alias数组spread为object，未命中browser源入口，wrapper取旧dist未存在createRuntimeSessionBinding。五组均入口失败，不能称产品行为反例。原stdout/stderr/exit保留。
2. 仅本包source-vitest.config改直接复用当前base（已有exactclient/node与sourceindex aliases）；source-second实际exit0、5/5、553ms。产品/旧tests无需修改。
3. source-noemit实际exit0，包含MCP源码/其client+protocol源依赖及现五组test；stdout/stderr为空。B guards已稳定freeze再检查，没有build或重复整套。

未运行build/fullsuite/current29/Pi/模型/host；独验与统一门禁由父指定owner另执行。等价提取不声称已完成Pi生命周期或M4所有宿主。
