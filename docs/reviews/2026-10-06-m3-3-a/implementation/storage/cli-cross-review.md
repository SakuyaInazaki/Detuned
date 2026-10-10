# A对B CLI只读互审

2026-10-06。审packages/cli/src/index.ts、new tests/contracts/m3-backup-cli.test.ts与examples/backup-recovery.md；未改产品/测试、未重跑检查。

一个可达测试finding：BKCLI02对backup_dir/data_dir使用tmpdir词法路径期待，API按canonical realparent返回，macOS tmpdir /var对应/private/var会失败。已报告父/B/C；应仅把预期规范为realpath(root)+basename，保持API不变。此项为夹具期待问题，不是备份覆盖或产品安全问题。

其余范围没有发现可达阻断：本地backup/restore仅委托storage维护业务，backup必offline，路径空值拒2；MaintenanceError前两code退出2，其余1。backup摘要不输出凭据，restore仅结果中一次admin_token；不依赖HTTP token/url，不写全局配置。init/serve gate各在mkdir前和DirectoryLock acquire后DBopen前，不绕业务状态。CLI仍正常finally关DB/释放锁。测试含真built新进程、真实serve拒backup、backup manifest/runtime与canonical sidecar gate、legacy初始化正例；执行结果由C记录。

示例与父冻结当前schema2/formatv1、物理附件/敏感数据库正文、一次凭据输出、incomplete人工检查、恢复旧actor新凭据后旧cursor失效/newpoll保持pending一致，不称完整M3.3。
