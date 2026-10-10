# M5部署/恢复与D01出口：现有夹具事实

本次仅有限读源码/公开示例，没有运行脚本或新增通过结论。D01 v0.1要求见 docs/09-validation.md §2：步骤1–4及有来源的非正式汇总；封存评审/外部回执/accepted属于之后M6/M7，不应在本出口伪造。

## 可复用入口

- `node scripts/scale/d01.mjs`：自建临时SQLite+真实HTTP，A提错误方案、B证据与failure、C独立`--reader`子进程仅拿URL/token/space/query，搜索→固定修订分段→引用改进。ledger含请求、固定材料hash与events。实际scope明写steps1–3；没有服务器重启、订阅pending或独立来源汇总。它用`runtime.db`而非CLI标准`detuned.sqlite`，无ArtifactFileStore，不能直接把输出目录当完整部署恢复夹具。当前脚本保留ledger目录，reader也无硬watchdog；新出口需自有监督/清退，不能原样称完整恢复脚本。
- `tests/integration/m3-event-recovery.test.ts` 第一组 `T08 real server/client restart preserves the pending batch...` + `tests/helpers/m3-event-worker.mjs`：真实不同PID服务器和客户端重开同DB；pending batch/events不变；固定材料ref/正文不变；ACK已提交但代理丢响应→新客户端重复确认，改签名有效payload仍ACK_INVALID。它已组合D01材料步骤与步骤4，但不是独立部署CLI全过程脚本。
- `tests/integration/m3-request-key-recovery.test.ts` 第一组 + `tests/helpers/m3-request-key-worker.mjs`：已提交201丢响应、新进程持久store同logicalId回同帖子；改body409；另ID另写。key-store是外部客户端私有目录，不在物理备份内。
- `tests/integration/m3-backup-recovery-independent.test.ts` 第一组 + `tests/helpers/m3-backup-recovery-worker.mjs`：真实CLI备份/恢复新目录，业务表/pending及登记附件保留、下载bytes；恢复human管理员与原actor新credential、旧token/签名游标失效、原pending新签名继续。第三组覆盖redacted/missing物理材料，不等于公开脱敏擦除。
- 公开命令单源 `examples/backup-recovery.md`：`detuned --json backup --offline --data-dir ./data --output ./private-backup-...`；`detuned --json restore --backup ./private-backup-... --data-dir ./restored-data`；`detuned serve --data-dir ./restored-data`。父目录既存、目标不存在、先停持锁服务；恢复token仅本次输出，不能进入公开receipt。

## 尚缺的单一具体候选

建议下一包自有 `scripts/integrations/deployment/d01-recovery.mjs`（路径仅候选）：真实CLI init/serve标准目录+独立普通human A/B/C凭据，组合步骤1–3、pending建立、服务器/C进程真实停止重启、步骤4材料恢复，再发布带固定cites的非正式note汇总（含适用范围、仍有效反例与来源；无评审批准措辞）。用显式私有路径/有限信号监督与PID reap、有限stdout白名单，保持令牌/原响应仅内存或私有IPC；不能照旧D01失败日志直接输出raw网络正文。

同一个脚本可顺序加入停服务→backup新目录→restore另一新目录→恢复普通身份的证据，而不是重复全部历史矩阵。部署TLS/真实Web可按随后父选定入口接线；目前未对这个组合取得任何运行证据。

## 必须核对的两种恢复差异

- **原目录重启**：签名secret/credentials不变，当前仍授权时旧cursor可用；consumer active_batch_id、batch_id/events/ack_seq一致，不因读取自动ACK。持久request-key目录保留，同意图同key复用且业务/事件/幂等条数只一份；已关联附件的固定revision关联、owner、state与真实下载SHA/bytes一致。仅DB重开不能证明整个目录附件恢复。
- **新目录restore**：业务/actor/membership/session/pending历史保存，旧credentials全部撤销，secret轮换；新human管理员正常管理，再给原普通human actor发限空间/能力新credential。旧token拒；同actor新token不让旧checkpoint/ACK/search/read签名复活；重新poll原pending得到新可用游标后显式ACK。不能把恢复管理员当普通用户验收，也不能把已禁actor自动启用。
- source/backup保持，失败不覆盖旧目录；恢复不包括客户端key-store、token-file、logs/staging，操作者须单独保护这些外部材料。恢复目录不能依赖原用户配置或系统信任。

## 最小产品变化判断

上述已有HTTP/client/CLI业务接口足以构造脚本，现事实未发现必须新增生产API/SQL/迁移的要求（候选零产品变更）。仍需下一包真实组合运行才能确认脚本/部署资源约束，不能以分散旧测试或本报告替代新证据。完整D01步骤5–7和断电/损盘/任意旧版本/任意平台均不属于这项有限出口证明。
