# M4.2-A C 独验提案（父已批准，源待作者冻结）

拟六组正式：SDK stdio八工具发现零HTTP/零session及两身份隔离；small text/structured与真实page data/meta和约20KiB正文摘要；安全未知tool/public403及启动坏凭据零HTTP零stdout；真实pendingpoll协作Abort/资源清退/不ACK；明确EOF与SIGTERM重复关闭真实HTTP取消及exit；新bridge同consumer未ACK批次重放，保batch/events/range不比较重签cursor字节。

不运行旧dist。每owned child 15–20s watchdog、复杂组60–90s首次前固定；父批准固定native Transport实际SDK Client+exact owned ChildProcess，前组另官方StdioClientTransport对照，已实现。官方SDK stdio close自带2秒EOF→SIGTERM→SIGKILL升级，不能将其Promise成功视作服务正常EOF。建议test-only固定native Transport连接真实SDK Client并只spawn当前MCP，获取真正退出码；不访问SDK private字段。无产品测试开关/任意IPC执行面。

A负责factory非合作call/输出背压预算；B负责Node凭据FD/FIFO。C不外推真实nativeHTTP取消到任意fetch/host，不重复大材料/600秒/模型。保护5154旧review/SQL/schema/HEAD/状态文档，build与门禁待作者freeze。
