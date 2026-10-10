# M3.2 单元 C 独立验证计划

2026-10-06。只读产品盘点和fresh基线；等待父冻结API与文件所有权后实施测试。未运行build/typecheck/lint/fullsuite/current29/600秒/模型调用。

## 基线

HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44；158 source/config/tests、37 current docs、5 mutable、3345历史review文件（完整含M3.1）、4 SQL/archive、2 schema profiles、208 tracked dist与48 untracked dist。完整逐文件SHA256、dirty状态、Node/pnpm/OS见baseline.json。首次新capture脚本uname序列化故障与修正记录见baseline-capture-attempts.json；它不是产品失败。

## Before事实

现有client RequestOptions与业务写函数支持显式requestKey；CLI publish/relate支持 --request-key/input.request_key。现有真实process helper以raw fetch发送显式key，因此能跨进程手动复用。当前没有RequestKeyStore、logicalOperationId或自动持久分配/恢复入口。不得通过导入不存在的新API制造产品反例。

## 候选所有权及有限验收

新增 tests/integration/m3-request-key-recovery.test.ts、tests/helpers/m3-request-key-worker.mjs；新verification目录。产品实现、旧测试、历史证据不改。helper仅固定server/client/drop-proxy/store-worker模式，私有IPC传临时凭据/数据，无任意shell。fork新进程，IPC屏障确定store竞争与代理提交后丢响应；计时器仅作有界失败门禁。

验证提交后丢响应、新进程按同ID重放只有一个post/revision/event/idempotency；真实多进程store原子同key；不同ID允许相同正文两次写；同key改正文服务409；恢复重核当前权限；同actor token轮换、不同actor/server/space/实际target隔离。验证损坏/拒写/发送前取消不发业务POST且不覆盖store；CLI publish/relate与旧显式key兼容、新旧选项冲突；基础client不依赖Node FS入口。

作者freeze后另捕执行前stable manifest，由父安排统一一次build/typecheck/lint/fullsuite/current29；对全部旧证据/SQL/archive/schema/H-R1/C2保护hash逐一比较，正常dist变化单列。formal数量与probe不相加，记录所有命令退出及首失败。完整M3、备份恢复、四宿主认证/模型和C2规模窗口不在本包。
