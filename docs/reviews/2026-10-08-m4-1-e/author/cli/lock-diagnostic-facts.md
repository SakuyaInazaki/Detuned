# 锁占用诊断只读事实

2026-10-08；无产品/测试修改或运行。

- `tests/integration/m2-artifacts-cli.test.ts:75–85` 持有真实DirectoryLock后启动serve，断言非零、未清理staging，stderr含“锁定”；这是有用的运维拒启动提示，不宜改断言吞成generic。
- `packages/cli/src/index.ts:352–354` 在Database打开、ArtifactFileStore孤儿清理与listen之前 acquire；失败进入399起catch，无shutdown时先安全清理本实例资源，再handleError。init同样在255–257 acquire后才打开DB，275起catch处理。
- `packages/storage-sqlite/src/lock.ts:19–27` O_EXCL失败后仅EEXIST进入占用检测；31–45尝试读PID并kill(pid,0)。48–59仅ESRCH判stale时尝试重取，失败也落同一诊断。
- 62–64当前抛普通Error，无专用class/code；message含动态PID和真实lockFilePath，不能直接恢复裸message输出。66的其他raw FS异常仍应固定未知诊断，不误称锁占用。
- E renderer因此确实丢了此前锁分支提示（普通Error→UNKNOWN_ERROR）。严格释放71–83另有固定安全错误，但标准serve shutdown已有独立固定阶段失败诊断，不应混同acquire占用。

最小方案候选：由父授权storage在62的既有EEXIST最终分支抛专用类型（如DirectoryLockUnavailableError），固定无PID/path文案“数据目录被锁定或无法安全取得目录锁，请确认其他实例状态后重试。”并导出；CLI仅instanceof此类型保该固定诊断，exit保持1，其他raw异常仍generic。不得凭任意code/string片段识别；不改变stale/reclaim/release或清理时序。

该分支包含不可读锁/无法重取的保守拒绝，不能宣称每次都已证明另一个活进程占用，也不建议盲删锁。若父不批准storage小类型扩展，只能另裁CLI识别边界，不能以正则解析含路径message冒充稳定类型。
