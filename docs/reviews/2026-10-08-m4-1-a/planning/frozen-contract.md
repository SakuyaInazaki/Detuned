# M4.1-A 冻结：读取与诊断CLI、搜索整页

C fresh 228 source / 4491旧review / 45docs完成，父冻结后实现。A仅client薄健康wrapper与protocol type-only，B CLI接线与guide，C统一built/真实HTTP CLI独验。旧证据/fixtures/schemaSQL不改，无模型/宿主Agent/安装/全局配置或发布。

从现LivenessEnvelopeSchema/ReadinessEnvelopeSchema以Static提取LivenessData/ReadinessData，runtime schema不变。DetunedClient getLiveness(opts?:{signal}) / getReadiness(opts?:{signal})薄request '/health/live' / '/health/ready'；成功仍{data,meta}，ready503为现SERVICE_NOT_READY/retryabletrue/details{ready:false}，不改成Boolean成功。不新增匿名token框架，optional/falsey token沿原请求无Authorization；受保护路径、CLI凭据fallback、取消/重试不变。diagnostics/me/capabilities及list/search/view现方法复用，不重造接口或收窄无关any。

B命令：me/capabilities/diagnostics输出data；health live/ready输出data。space list、thread list <space-id> [--state open|archived]、post revisions <space-id> <post-id>用limit默认20/strict1..100和opaquecursor，完整{data,meta}输出。view <space-id> <name findings|failures|open-questions>输出data无meta。search默认原data，--page或--cursor出现输出完整page，--thread映射thread_id，受影响limit非法exit2且不请求；opaquecursor不decode。所有权限/游标规则仍服务端，不复制。旧read/context/postread/threadposts格式保留，无新增HTTP endpoint。

两薄wrapper不写镜像测试；B/C真实HTTP+CLI覆盖匿名/ready503/取消或错误。A只source noEmit一次待共享写态稳定，C统一build/fullsuite/compat gate。A后续只读核B调用和health手册，不修改B拥有产品或六全局文档。
