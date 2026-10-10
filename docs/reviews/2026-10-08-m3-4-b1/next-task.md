# 下一任务：M3.4-B.2 有界退出与严格锁释放

父已接受 B.1 有限本机结果，真实证据见[本包入口](README.md)。按持续授权自动推进；下述为任务书，fresh baseline 后实现，不把它写成已有功能。日志/健康/admin采样与旧配额/限流保持，不扩模型、宿主、发布、全局配置或600秒基准。

## 已选行为

默认 shutdown 10秒；CLI `serve --shutdown-timeout-ms` 为1000..120000的安全整数，非法在mkdir/open前固定无敏感诊断拒绝。首次SIGINT/SIGTERM建立唯一serve-owned promise，先Operations.beginDraining与RuntimeResources.beginClosing同步cancelAll并拒新业务，再等待所有在途handler finally与显式dispose完成，随后app.close完成→db.close→DirectoryLock.releaseStrict。重复signal幂等。health尽力保持最小语义，不保证Fastify closing后仍可达。

deadline保持到严格锁释放完成；超时或任意阶段失败固定无敏感诊断、进程非零退出，不提前DBclose/放锁留下可继续mutation。同步SQLite/native调用不可硬抢占，deadline在事件循环恢复后可观察；不能声称硬CPU时限。signal/listenfailure共享清理路径，remove自身listeners；请求writer只清自身listener、不destroy共享stderr，仍非耐久审计。

## 所有权与接线

A：新server/runtime-resources.ts，lease acquire(cancel)→幂等finish，closing同步cancelAll/单项throw隔离继续、waitForIdle；DirectoryLock.releaseStrict保旧release/offline语义；BlobStorePort.open必需返回{chunks,dispose():Promise<void>}，ArtifactService传disposer；实际ReadStream dispose幂等destroy且等待close，晚open取消明确dispose，不依首次next前iterator.return。关联fixture适配、约6项作者测试、docs07与ADR043。

B：app/routes artifacts+events+export、CLI shutdown helper/index、operations指南、约4项真实入口测试。upload lease覆盖整个handler finally/publish/DBtransaction/discard；metadata exists覆盖整个await；download从open前到真实dispose完；poll覆盖整个handler finally；export在streamdestroy/session关闭后释放。所有族统一cancelAll后才任何await，不依多个plugin hook先后；复用现poll/export取消语义，不换consumer框架。

C：独立真实signal、慢multipart/下载、长poll/export，一受控publish未commit屏障验证不提早DBclose/放锁，deadline非零+重启既有恢复，strictlock/app/db失败安全退出。精确试验取舍fresh后冻结；不设计无限矩阵。

## 合并 M3 门禁与边界

补真正剩余 T02 十同时同key，以及 T13 同敏感marker跨read/历史/FTS/context/附件/export/幂等replay与审计scope。T12/T08复用既有组合证据；M6正式快照/封存仍未启用，不用普通帖子冒称正式评审。current29第11继续复用A.1批准adapter，原旧脚本与失败不改。

保每次首失败/适用条件，作者source定向/noEmit，C统一built/gates；不写尚未运行成功。既有schema/SQL/旧证据/fixture原字节保护，所有接口变更按fresh后冻结所有权实施。B.2完成后由父审查M3剩余边界，再衔接下一必要工程任务，不提前标完整M3/M4–M7完成。
