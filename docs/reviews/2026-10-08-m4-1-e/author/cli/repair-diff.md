# v1 → v2 授权窄修

- storage lock.ts：仅新增DirectoryLockUnavailableError固定message/name；原EEXIST最终throw三行动态Error换成该类型。其余获取、PID检查、stale重取、释放/strictrelease路径不变，index已有wildcard，无需修改。
- cli-errors.ts：导入该类型，真实instanceof输出UNKNOWN_ERROR和其固定message。mapExitCode未改，此类仍默认exit1。
- m4-cli-errors.test.ts：ECLI01现有case增加该具体类型code/message断言，case数仍4；其余断言不变。真实锁进程由C旧m2-artifacts-cli场景验证。
- cli-errors-credentials guide：追加安全锁诊断和不可盲删锁边界。

首full582/585由C保留；旧storage.test.ts159依赖旧文案prefix已报父，B未改该文件。父指定新固定文案造成该期待需要精确更新，不能假装不存在。
