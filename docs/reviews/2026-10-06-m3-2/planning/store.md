# M3.2 A：父冻结接口与文件协议

2026-10-06。只读事实与父冻结后实现；不修改M3.1旧证据。

基础HTTP client增加可注入RequestKeyStore与WriteOptions.logicalOperationId，10个现有业务幂等wrapper内部接线。subscribe仍使用consumer_key，不进入本接口。服务namespace、GET /me当前actor、space与实际operation/target组成scope，固定null字段；身份不可由调用者覆盖。post修订family为真实服务post.revision。setToken变化阻止准备中的业务发送。

Node可选入口@detuned/client/node导出FileRequestKeyStore.create(directory)，基础入口无node FS导入。tuple为[1,serverNamespace,actorId,spaceId,operation,target,logicalOperationId]，sha256仅作文件寻址，不由payload猜逻辑操作。记录完整包含version/scope/logicalOperationId/requestKey。URL只允许无userinfo/query/fragment的http(s)，规范host/默认port、去尾slash，保留部署path。

本机私有真实目录0700、同uid；记录普通文件0600、同uid、最多16KiB。临时文件排他创建，完整写和fsync后hard-link无覆盖发布，目录sync后返回；竞争读取同final并校验完整tuple。任何失败不删除final，只清本次temp；崩溃temp可人工清理，不设置锁。创建目录sync自身及父目录，不递归创建任意祖先。目录须受信，不宣称防同uid恶意改目录。

logicalOperationId与明确key同时给拒INVALID_OPTIONS；store无ID不自动落盘，ID无store拒绝。失败/成功/取消都保留key，取消及时结束等待，底层I/O可能继续留下恢复记录。正文、token、header、响应与附件不持久，metadata仍暴露操作关联。
