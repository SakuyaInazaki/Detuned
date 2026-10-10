# M3.4-B.1 冻结：就绪与管理员采样

父冻结后执行，C fresh baseline 为旧证据保护入口。StoragePort 必需 checkReadiness()/sampleOperationalStatus()；SqliteStorage 第二可选参数 dataDir 保持一参兼容。OperationsService(storage,auth) getReadiness()/beginDraining()/getDiagnostics(ctx)；后者刷新凭据并检查实例管理员。

ready 检查连接、有限当前迁移集合、initialized 与 secret 存在性；配置目录还检查正规目录及 R/W/X。不是完整 DDL/integrity/FK 审计，不试写。未配置目录明确 configured=false/available=null。生命周期 draining 只改变状态和 ready，不增加 shutdown 回收框架。

公共类型 StorageOperationalStatus/OperationsDiagnostics/FileSample 由 protocol 单源定义；字节为最多32位非负十进制字符串。artifact PK 至多10001项，越界 complete=false，观测为下界。main/WAL 末段 O_NOFOLLOW/O_NONBLOCK + sameFD fstat，仅正规文件，缺失和不可用区分；不泄路径。内存与非 WAL 分别 not_applicable。WAL NOOP 仅观察，不推进 checkpoint，不推断持有 reader 的原因。数据库与文件非原子采样，同步查询不保证硬抢占。

B负责传输与安全日志；B.2独立处理有界关闭和锁释放。没有WAL硬quota、后台timer、新schema或ledger。本包新增前旧服务没有该管理员采样/健康接口；不以missing import人为构造产品反例。
