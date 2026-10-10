# v2 锁诊断修复报告

父批准的唯一产品修：保明确锁分支可操作诊断，移除PID/path动态输出。旧run调用方未发现基于rawmessage的业务协议；一处正式storage test regex依赖旧prefix，已在改动前报父/C等待owner授权，未擅改旧断言。

新增类型仅来自DirectoryLock.acquire的既有EEXIST最终拒绝分支，其他FS原异常继续generic。该分支也包括无法读取/重取锁的保守失败，诊断不宣称每次存在已确认活进程。CLI mapExitCode、daemon/清理、锁与发布时序不变。索引已export * lock.ts，无新增导出文件变更。

repair-noemit.exitcode=0，包含新test与相关源码；未重复source测试、build/fullsuite/current29。ECLI01添加typed诊断断言不增加case数量，真实锁退出/未清staging由C复验旧正式入口。原v1 manifest保持，v2 manifest新增lock.ts并刷新4个修复文件hash，其余v1文件保持；报告/差异与前后manifest可审。

现产品/tests/guide再次冻结，唯一统一第二build与复验由C安排。
