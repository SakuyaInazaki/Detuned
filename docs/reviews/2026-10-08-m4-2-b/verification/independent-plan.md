# M4.2-B C 真实独验（父批准六组）

新增唯一 tests/contracts/m4-mcp-binding-independent.test.ts，暂无外helper。实际SDK Client配固定NativeBridge Transport，只spawn当前builtMCP；不读SDKprivate字段、不允许任意命令IPC。每child20s、前五组60s、关闭组90s首次前固定。源语法已检查，未noEmit/build/运行旧dist。

六组：发现+invalid/nested/allOf零HTTP/session；同space两真实write共用global/session、第二space及另一actor独立；单waiter取消另一成功；全global取消实际proxyHTTP资源0后新显式call重新初始化；真实upstream session201完整body+row1后drop，业务0及terminal0newHTTP、新runtime恢复；cap/session初始化屏障EOF/repeatSIGTERM exactexit0/noACK/no晚业务。session取消可能已提交，不称回滚。

并发两SDK消息由测试driver一批JSONL写入同stdin（双方真实请求，不做客户端业务合并）；gateway仅allow/hold-cap/hold-session/drop-session固定策略，所有body/headers来自真实HTTP服务，没有伪造不合schema响应。HTTP close跟踪实际nativefetch取消；release为显式barrier非sleep时序。只有有限小研究body，无新增负载/模型/600秒。父freeze后集中build/defaultgates/current29；旧5308材料/SQL/schema/HEAD/状态保护。
