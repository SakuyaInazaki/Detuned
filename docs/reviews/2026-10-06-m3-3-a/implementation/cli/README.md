# M3.3-A B 交付：待统一 built 验证

真实before：旧built backup/restore均unsupported exit1（对应before日志）；旧built嵌套init实际exit0、serve临时端口成功监听并SIGTERM exit0。正例以授权loopback执行，仅摘要记录token存在而不保留真实token，临时目录清理。

CLI backup/restore直接调用storage-sqlite本地业务接口，不走HTTP/getClient。缺offline→2；MaintenanceError INVALID_OPTIONS/OFFLINE_REQUIRED→2，其余→1；原HTTP映射不变。backup输出非敏感摘要，restore沿init风格只一次stdout新human恢复管理员token。init/serve mkdir前与acquire锁后DBopen前双gate，物理备份/残留sidecar拒runtime。

新五项正式测试在tests/contracts/m3-backup-cli.test.ts：参数/离线门禁、真实备份恢复及一次凭据输出、active serve互斥、坏manifest拒runtime/legacy正常兼容、incomplete sidecar不创建目标。每CLI child 15秒清退门禁，每case30秒；stdout/stderr使用UTF8流decoder，不降低业务断言。统一build后由C运行，当前未声称通过。

storage-sqlite源码alias TypeScript noEmit实际exit0，日志及exit-code另存；本单元未build/运行新增正式built测试或全套。产品/tests/example精确sha256在freeze-manifest。父freeze后只读互审A，不改其产品。没有安装/commit/push/全局配置/模型调用；物理备份仅私有本机范围，不宣称完整M3.3/T12/M3完成。
