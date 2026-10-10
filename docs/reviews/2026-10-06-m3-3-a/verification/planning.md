# M3.3-A 单元 C：fresh基线与短验收计划

2026-10-06。先只读盘点与baseline，不运行build/fullsuite/备份实验；等待父一次冻结具体接口、manifest、目录状态与fault契约。未提交/push/安装/模型调用或调用被禁止技能。

## Fresh保护基线

baseline.json捕HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44与dirty；165源码/配置/测试、38当前docs、5mutable、3491全部旧review证据（包括完整M3.2包）、4SQL/archive、2schema、208tracked+60untracked dist。Node/pnpm/OS与逐文件SHA256均在新包；没有覆写任何旧capture。

## C所有权与有限验收

产品作者文件不改。C新增 tests/integration/m3-backup-recovery-independent.test.ts、新 helper tests/helpers/m3-backup-recovery-worker.mjs（如父认可需要），仅固定server/management-worker模式私有IPC，不执行任意shell；新review/verification目录。真实CLI backup/restore子进程使用固定arguments；凭据只私有IPC或私有临时文件，证据脱密。目录/DB所有测试来自独立临时fixture，不触旧归档。

父freeze后先有限真实before（旧built无backup/restore是既有命令缺口，不通过不存在API导入/编译失败冒反例），然后新增正式回归。覆盖：

- 真实serve进程持DirectoryLock，offline backup拒绝；停止服务/WAL残留后得到一致DB。源和backup同名/内部/已有目标拒绝，不覆盖。
- 正常backup→新目录restore→新server进程：帖子/修订/关系、附件bytes/hash/state、事件/幂等结果、consumer pending账本保真；未登记对象/staging/logs/client-key-store/锁与明文token排除。
- 全旧credentials拒绝；new human recovery admin重发同oldactor普通token，以此**有效新token**证明old checkpoint/ack/read/search等旧签名cursor仍拒，不能用旧token401代替。new poll恢复同pending batch、新cursor有效ack，当前权限门禁保持。
- manifest结构/version/hash/bytes/重复项/漏登记附件/越界路径/symlink，DB结构/FK，以及ready缺失或hash错拒绝；redacted/missing合法物理缺失保留状态，已存在非ready物理file核hash并准确present。
- 有界注入copy、file/目录fsync、恢复管理员事务、publication/readiness边界故障；证明源/backup未损坏、目标半成品拒init/serve、backup成品也不可直接serve。IPC屏障控制故障时刻，不用sleep猜时序；所有attempt记录首失败。

统一build/typecheck/lint/fullsuite/current29待作者freeze后父授权一次。scope不扩结构化导入导出、legacy迁移、运维限额/全M3或600秒规模重跑。

## 独立评估 sidecar+新目录 协议

确定性parent-sidecar以O_EXCL先占用，再mkdir最终目标可避免rename覆盖已有空目录。它不是整目录原子rename，安全性依赖读取方严格协作门禁：init/serve必须在任何mkdir/bootstrap/DB open与锁回收前检查incomplete，并在获得DirectoryLock后复查；否则restore正在建立目录时可被init补初始化或serve启动。

sidecar必须在mkdir前完成文件fsync与parent sync；整个DB/objects/manifest、管理员事务及目录数据确认持久后才到ready移除sidecar/parent sync。失败不得默认删除sidecar留下可启动半目录，残余材料只能按明确人工清理/新目标重试恢复。sidecar文件名、严格内容/owner/权限、目标归属、同parent规范化与拒symlink须父freeze。

**backup成品的sidecar被移除后仍必须具有持久且可识别的backup-only状态**；仅absence-of-incomplete不足以拒直接serve，因为旧CLI看到其中detuned.sqlite即可打开。需固定directory-state/backup manifest类型门禁，由父选具体协议；C将用真实CLI独验backup目录init/serve均拒且不改其字节。若完成标志unlink后的parent fsync失败，作者需准确说明fail-closed重立marker或完整但未交付状态，不能不区分就报告半成品可启动。

DirectoryLock只拒遵循此协议的活跃Detuned进程，不能证明任意外部SQLite writer不存在；本包不宣称恶意同uid文件替换或无锁writer防护。故障注入名称与接口须父freeze后实现；这份评估未验证备份能力。
