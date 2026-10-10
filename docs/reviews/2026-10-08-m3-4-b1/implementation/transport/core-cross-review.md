# B → A 只读互审

读取 OperationsService、StoragePort新增方法、SqliteStorage delegation、operational-status.ts 与冻结契约。未发现具体可达阻塞。

OperationsService 管理诊断先 refreshContext + requireInstanceAdmin，后采样；统计异常固定 INTERNAL_ERROR，无原cause。draining只轻状态/getReadiness短路，不改资源关闭。ready只有限迁移集合/current、initialized/secret存在及配置目录访问，catch false，无DDL/integrity写或配额探写。

页/模式/NOOP数据数值验证；NOOP未主动checkpoint，不推断reader归因，-1转null。byte BigInt→最多32位decimal。主文件/WAL末段NOFOLLOW+NONBLOCK、sameFD fstat只正规文件，finally关闭；内存/nonWAL applicability准确。artifact bounded10001，complete false表示下界，非JS SUM溢出。样本非事务一致，也不保证权限hint等于下一写成功。

限制：本审仅只读，长期WAL/heldreader实际采样及断流/关闭独验归C；没有硬CPU抢占/全目录quota/完整退出保证。
