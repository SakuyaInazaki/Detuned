# M4.5-B 作者实现

新增显式 factory inputMode?: flat|wrapped，默认 flat。main独读DETUNED_MCP_INPUT_MODE，在解析凭据前安全拒非法值；不回显输入。wrapped八广告完整嵌入canonical，SDK全外层/inner验证后返回原inner引用，继续原space binding/request_key dispatcher，不修改client/HTTP业务。

唯一source定向：pnpm exec vitest run tests/contracts/m4-mcp-input-mode.test.ts，首4/4，实际exit0。无模型/loopback/宿主。noEmit含新test：首exit2，测试数组索引TS2532；仅补存在性类型标注，必要第二exit0。原日志保留，没有把首失败改写成功；纯类型修不重复运行相同4case。

模式广告/合法八代表与legacy/checkpoint/非法outer-inner-branch-allOf/非法factorymode覆盖；真正native eight与HTTP/session/close由独验负责，作者未冒称完成。未build/full/current probes，D统一执行。四产品/test文件freeze后停写。
