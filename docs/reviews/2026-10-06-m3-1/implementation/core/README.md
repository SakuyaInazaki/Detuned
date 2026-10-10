# M3.1 core交付（已冻结，待独验）

唯一产品文件event-service.ts；新正式m3-event-core.test.ts；docs03/ADR034。Port/SQLite/SQL/通用crypto/旧formal未改。保留同步即时poll，加pollWithWait和末尾可选EventWaitScheduler（同文件自动export）；100ms monotonic短检/Abort，所有业务判断短同步事务重读，最多128实际等待槽，public投影与strict/精确legacy四键ack校验，Clock floor24h重投续签、真实持久范围先于重复成功。

真实 [commands.json](commands.json)：before-first 3项全红（private泄投、注入Clock签发错、重复ack错误through成功）；before-formal.ts保首版本。after-first 3/3、after-expanded-first 11/11首绿；typecheck-first sourcealias全core/storage与新正式noEmit exit0。首before-wait脚本自身相对路径错一层exit1保留，不算反例；修自有路径后旧accepted dist合法wait_ms1000在0.246ms回null，consumer未变，记录功能尚未启用，不误读旧最长25秒为必须等待。

11正式覆盖private初投/pending、Clock等号/+1、重复ack范围、strict+legacy/跨scope/extra/consumer、过期repoll同batch、旧ack单调、500空扫描+100limit、scheduler无事务/截止/新事件、撤凭据+epoch、128槽及429/取消释放、持久化后Abort恢复、并发pending+私密空batch即时。并发同连接Promise控制证明当前服务单batch，不冒充verify双进程/两连接恢复。真实HTTP新进程/ack丢响应/跨端取消由独验/协议单元覆盖。

未build/fullsuite/600秒、未改旧tests。freeze-manifest.json四产品/正式/规范路径含实际hash；首失败/修正与日志原样保留。等待独验及父裁定，不扩下一模块。
