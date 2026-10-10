# A D01作者交付

两产品脚本+一个示例，无生产API/SQL/schema/dependency变化。entry支持 --repo-root、--receipt、--smoke-20；worker仅private IPC。仅读取当前built包，不启动rootbuild/容器/VM/模型。

实际记录：first运行initCLI0后loopback EPERM，私有tmp/child全清；首受管执行请求自动审核超时，未执行且无second日志，当时工具允许一次重试。second实际1194ms失败restart AssertionError，固定端口夹具先前改变serverNamespace；根准保原origin，并advanced IPC保Uint8Array。third实际2088ms组合passed，9子进程close/reap，自有tmp删，CLI/server退出0，client SIGTERM实录（不冒自然退出）。首失败/原stdout/stderr/exit均保留。

`third.receipt.json`核普通actor、固定ref、pending不自动ACK、持久key同帖子、附件SHA、typed source_refs summary、新目录restore旧token/同actor旧cursor拒、新poll原pending及显式ACK。不是封存评审，也不是断电/磁盘故障或Linux认证。

node --check两脚本实际0。未运行 --smoke-20（交D明确调用），未运行build/full/current29/browser或Linux容器。receipt私有路径输出只有安全阶段/PID/布尔及错误name/code，不保存token、rawHTTP错误正文或材料。所有服务监听仅自有127.0.0.1。

独验可直接从Linux builder显式repo运行；DB断言位于脚本restart后readonly SQLite短连接，检查唯一改进ID、consumer ack_seq未推进与revision_artifacts绑定。恢复还由真实client验证token/cursor/hash/pending。tmp finally删除，不提供事后数据目录；receipt不是完整全库泄漏。D如需独立DBoracle，应另建其owned fixture而非要求公开凭据。
