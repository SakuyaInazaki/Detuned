# M4.1-E A → B v2 只读交叉审查

有限结论：未发现父冻结范围内具体可达新增阻断。独立读实际 B v2 12文件清单与实现，不以 C 已通过结果代替审查；未测试/改产品。A5 v2/B12 v2 哈希全部匹配；原v1保留。

- configureCliParser在子命令声明前抑制writeErr/outputError并exitOverride；实际parseAsync唯一入口有catch，成功helpDisplayed/version返回不转错误，其他parser固定VALIDATION_ERROR。required-value全树声明扫描无条件消费下一项（包括值--），long=value整体跳过，真正--停止，非值exact--json才标；unknown不猜arity。当前不支持的optional/variadic/short-value显式拒，未自造完整Commander语法。已核ECLI02/03对应value/terminator/help输出断言，未运行它们。
- getClient显式传四source到A resolver，online action都在try/catch或外层export action awaitcatch覆盖；resolver异常不会成为裸promise。help/version由原生解析先结束不创建client；offline维护未调用getClient。
- renderCliError只信真实类型，不信ducktyped raw code/message：public DetunedError保原message/details，运输/协议/timeout/abort固定safe；RequestKey/offline已核诊断保留；未知固定UNKNOWN_ERROR。mapExitCode原分类没重排，合法credential/adminToken成功data stdout仍保持。
- publish/relate safe object读取固定输入错误、unknown op不回显。五处Parameters<client方法>仅发送边界静态桥，运行仍调用原sharedclient/HTTP/core验证，不将cast宣传为字段合法性证明；未新增本地ACL/业务规则。
- export/artifact仅typed safe marker，仍temp完整write/fsync/close→link无覆盖→parent sync，finally仅own temp/handle，postpublication错误保completefinal及持久性不确认文字；没有借净化改变半流重试/发布/cleanup顺序。
- lock.ts仅最终EEXIST失败throw换真实DirectoryLockUnavailableError固定中文；PID探测/stale重取/close/releaseStrict/legacyrelease算法原样。CLI仅instanceof保UNKNOWN_ERROR/exit1有用诊断，无path/PID，不推断每种异常等于活进程占锁。storageindex既有wildcard已导出，不新接口层。

读B manifest/README/repair说明、index/argv-diagnostics/cli-errors/artifact-io/lock和B新formal/guide；C适配旧parser期待与lockregex属授权证据差异，本报告未编辑它们。MCP资料任务暂停，当前E收口后停写。
