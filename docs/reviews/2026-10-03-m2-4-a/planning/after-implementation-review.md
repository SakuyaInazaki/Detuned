# M2.4-A 跨单元只读复核

2026-10-03。仅源码/正式测试阅读，未run测试/build/网络；这是A对B最小delta交叉审查，不是对A核心代码的独立验收，不代替父最终验证。

## B delta核对

- protocol/search.ts:225–232：build固定api_version/request_id/data/meta；serialize仅JSON.stringify该builder；bytes仅TextEncoder同serialize结果。没有近似固定开销或假request_id。
- server/routes/spaces.ts:122–128：同req.id交core预算和serialize；发送application/json字符串，避免对象再序列化/业务裁减。app.ts:76显式传同clock。源码发送与计量同源，无B delta具体缺陷发现；真实wire事实仍以独立HTTP测试结果为准。
- client.ts:528–536：getContext保留request返回data/meta并静态声明ContextPage（cast没有新runtime validator，这符合冻结范围）；759–764 forum_context直接返回整page，没有再取.data。MCP index.ts:61–66整result进text，Pi index.ts:57–60整result进text/details，均没有再次丢meta。SDKpretty外包装不纳入HTTPbudget，协议description及docs04:185–189明确。
- cross-interface-contract.test.ts:74–81只把space_id/rules/checkpoint断言路径移至data，原发布主题与规则/检查点断言仍保留；m2-knowledge-view-contracts.test.ts:126–128仍检查真实context来源状态。B新m2-context-contracts.test.ts C01–C04源码覆盖实际raw正文bytes/req.id转义/truefalsemeta/OpenAPI及tool传播，没有用serializer重建替代实际raw比对。未发现删去原断言来隐藏错误的具体事实。

## 已知边界（并非B新增回归）

CLI index.ts:268仍只printOutput(res.data)，因此CLI context不展示truncated；搜索:292同样丢分页meta。这是既存输出路径，docs04已如实声明contextCLI边界，下包是否迁移由父决定。focus已明确400，schema允许字段不代表已支持；forum_read仍有旧规划/实际落差，另见next-step-facts.md，不扩成本包拒收项。

本复核没有对运行成功、所有宿主、Node22或完整T06作新承诺。产品/测试/规范保持冻结。
