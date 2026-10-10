# 下一任务：M3.3-A 离线一致物理备份与新目录恢复

2026-10-06。M3.2父已接受，本文件仅指导下一包，不授权本轮开始产品实现或备份实验。事实依据：[只读盘点](planning/m3-3-a-facts.md)。下一包首期范围是离线一致物理备份与恢复到新目录；结构化导出/导入、完整迁移演练另包。不得把本包有限交付声称完整T12、全M3.3或完整M3完成。

## 父已确定的行为边界

首包仅接受当前schema2与backup-format v1；legacy/future/unknown/corrupt明确拒绝，不静默升级原库。候选CLI为`backup --offline --data-dir SOURCE --output NEW_BACKUP_DIR`与`restore --backup BACKUP_DIR --data-dir NEW_DATA_DIR`，准确参数及接口须开工一次冻结。

备份使用物理语义：ready登记附件必须存在且bytes/hash匹配；redacted/missing保留DB状态，登记文件存在则核hash/bytes后保留，缺失则manifest明确present=false，不改ready。仅复制DB登记objects；排除未登记objects、staging、logs、本机client-key-store、锁与凭据明文。私有物理备份可能含已脱敏历史bytes及DB凭据哈希，不是公开导出或全球擦除，须私有保存。

恢复轮换现token_secret，使所有旧签名cursor失效；不新增schema/epoch字段。新库事务撤销全部旧credentials，创建一个新的本地human recovery admin与一次性新admin凭据。保留原actor/session/membership/业务历史，不复用或重新启用被禁用旧actor。明文管理员凭据沿init模式仅一次敏感输出，不入manifest、日志或全局配置。新管理员可经现API给原actor重发凭据，普通Agent不得得到管理员权限。

## 开工短规划与一次接口冻结

先读AGENTS、README、docs00/08/11、当前progress/reviews和docs07§6及相关03/04，保留所有旧证据和已接受dirty。主代理负责拆分、路线与验收，gpt-6.1-sol子Agent按划定所有权实现。禁止deepseek-brainstorm、commit/push/reset/clean、安装、全局配置或模型调用。

只做窄读后由父一次冻结：

1. SOURCE真实目录边界与DirectoryLock合作协议、显式offline、当前DB分类、WAL checkpoint busy结果校验及关闭顺序。活跃serve拒备份；锁只覆盖遵循Detuned约定的进程，不承诺挡住恶意忽略锁的任意writer。必须获得一致DB，不能直接复制活跃.db或把现SqliteStorage构造器吞异常pragma当checkpoint成功。
2. 严格manifest v1、固定safe相对名、重复路径/链接/穿越/大小/hash/版本校验、附件DB状态与存在性匹配；SQLite物理结构与foreign_key_check先验。备份及restore目标必须新目录，拒source内、源/备份别名和任何覆盖；原目录及备份保持。
3. 可验证的无覆盖发布与未完成状态拒启协议。Node rename可覆盖已存在空目录，不能用access+rename竞态冒充no-replace。提出最小方案及各故障边界，由父裁定后实现；失败不能把半套当可启动成果，也不能破坏原目录或备份。
4. 窄核实际is_admin存储与授权复用点，冻结精确本地恢复管理事务/API；不得靠清掉initialized或调用fresh bootstrap重发。确认旧token撤销与secret轮换是不同动作，原actor的禁用事实保持。

开工先划分存储/备份恢复服务、CLI组合根、正式回归与独立验证、文档所有权。禁止先建大量未来空API；基础业务判断仍在服务端/本地受信管理业务层，不在CLI复制状态机。不扩导入导出、后台调度、真实宿主配置或模型评估。

## 真实验收与证据

先记录fresh baseline和真实before，保留首失败；新增正式回归后实现，统一build与独验，命令/退出码/唯一测试数如实记录。核心CI不依赖模型账户或网络推理。

- 活跃真实serve持锁时backup明确拒绝；遗留WAL场景得到一致DB，checkpoint busy/拒写失败可见，不误称成功。
- manifest损坏、hash/bytes/version不符、路径穿越、重复路径、链接与已有目标覆盖均拒绝；源及备份原字节不变。不让ready缺失静默成为成功备份；redacted/missing状态与present准确。
- 真正新目录恢复、重启服务后同业务对象/修订/附件/幂等记录与pending批次保持；不产生新业务副作用。原目录仍可用且未被恢复过程改写。
- 全部旧credentials拒绝，新recovery admin可经现API发普通凭据。给同原actor重发新凭据后，独立验证旧checkpoint/ack及其它旧签名cursor拒绝；不能仅用旧token401冒充cursor独立失效证明。新poll可恢复原pending并获得新有效cursor，当前权限仍检查。
- 各文件复制/fsync、清单、DB恢复事务、目录发布/完成标志边界故障注入；不能部分成功或启用半套，重试/人工清理条件有明确证据。
- 备份不含排除材料与明文凭据，最终新凭据只输出一次；旧管理员/被禁用actor不被悄悄重新启用。

结束说明实际完成范围、验证证据、未运行检查、限制与下一包。崩溃恢复和备份时点RPO分别报告，恢复不能找回备份以后数据；完整迁移、结构化导出导入与其余运维仍待后续。
