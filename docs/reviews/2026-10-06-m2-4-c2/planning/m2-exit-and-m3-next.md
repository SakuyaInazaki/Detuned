# M2 本机出口与下一包事实建议

2026-10-06；仅只读规划，父 Agent 决定是否关闭里程碑及下一路线。未运行新测试、未改产品或现行规范；C.2 正式规模窗口尚待结果。

## 可关闭与待证

- **M2.1 / T07 本机工程项已有接受证据**：附件 stage/hash/quota/授权、并发与中断、DB 失败无半成品、孤儿清理；见 `docs/progress.md:588` 与 `2026-10-03-m2-1/verification/r1-final/verification.md`（210/18）。私有 review/check 附件尚未启用，不能把拒绝该绑定算成未来私有工作流实现。
- **M2.2 与 M2.3 / T05 本机有限正确性已有接受证据**：typed 新写及历史兼容、固定引用、失败范围/来源状态、中文 1/2/3 字/英文/emoji、FTS 标点与 LIKE 字面过滤、跨空间隔离与分页；见 `docs/progress.md:597,604,611`、M2.3 `verification/acceptance-matrix.md` SQ01–09 及同目录最终 `verification.md`。不是 100k 延迟结论。
- **M2.4 / T06 功能链可认定已实现**：规则固定 ref、正文 UTF8 续读、目录元数据续页、focus、实际 envelope 预算、来源更新与同 snapshot 空间 checkpoint，C.1 独验 333/35/current29 通过（C.1 `verification/verification.md:5` 起）。C.2 新 `m2-context-session-chain.test.ts` 与 `scripts/scale/verify-session.mjs`进一步覆盖新进程只经 HTTP 发现失败适用条件、规则/目录/固定来源及 checkpoint→订阅→后续修订→poll/ack；目前属于新单元链证据，最终统一门禁和正式 100k/1M/20client 窗口结果未填。
- **D01 步骤 1–3 不宜直接整项打勾**：`docs/09-validation.md:40` 起要求 A 错误提案→B 三点反例→C 检索并引用原提案修订与反例、提出正确更新策略。当前 seed 的失败锚点有 10/2 反例、条件/变体/retry_when与固定 summary 来源，新会话 HTTP 发现已覆盖 M2 出口关键能力；seed 是直接批量 fixture，不能替代这三角色的真实写入可重放步骤。现新 formal 主要验证发现/续读，不发布 C 的改进提案。父关闭完整 D01 1–3 前宜核已有示例脚本真实执行证据或补一个窄确定性 HTTP 演示，不扩到评审步骤。

`docs/08-roadmap.md:46–53` 的 M2 出口是“新客户端仅凭论坛材料找到已有反例并看到适用范围”；C.2 全量链及性能结果接受后才合并判断。2CPU/4GiB/SSD 目标与实际主机差异、长轮询等待单列，不能由功能通过推出目标硬件认证。

## 最小下一包候选：M3.1 可靠消费正确性与恢复

**已有可用**：`packages/core/src/services/event-service.ts:29–365` 已提供 subscription/consumer、单 active batch、500 扫描/100 匹配、空匹配 batch、持久重投、ack 幂等及 ACL epoch；HTTP `packages/server/src/routes/events.ts`、共用 client 的 signal/超时/有界重试也已存在。不是从零重写 M3；M0/M1 旧正式与 current29 有消费/客户端证据，C.2 catch-up 只能补正常负载链，不能代替所有恢复故障矩阵。

**需窄核的真实实现偏差/缺口**：poll 筛选处未见 event.visibility/current 私有对象投影检查；重投直接读保存 event_ids；token 只含 consumer/batch/through_seq/exp，`exp` 用 Date.now 而非注入 Clock，文档却要求 actor/space 绑定；ack 校验重复成功分支位于 persisted through_seq 比较之前。以上是可复现候选条件，须 before 判定实际风险，不能仅凭静态审查宣布漏洞或为尚未启用 review 模块扩框架。现同步 poll 完全不读取 wait_ms（route 直接调用）；`docs/04-protocol.md:13` **仅规定长轮询最长25秒**，不保证最少等待/每次必须等满，不能把立即返回本身判为违反该句；要启用有效等待语义，先由父冻结“无新增时等待上限、事件唤醒、断连取消、等待期间重鉴权”合同。

**建议有限交付**：先核旧正式覆盖图，再用独立 SQLite/真实 HTTP 屏障补 T08（`docs09:15` 后）：poll→服务与客户端重启重投同 batch/固定范围，ack 响应丢失重试不降 seq，跨 consumer/篡改/乱序拒绝，500 空匹配推进、并发 poll 唯一 active batch、撤权/epoch 立即拒绝；取消只终止请求，永不偷偷 ack。针对实证偏差最小修复，统一 Clock/严格凭据和当前可见性；如父选长轮询再加入有界异步等待而不持跨 await 写事务。保持空间 checkpoint、既有消费者恢复及显式 ack 语义（`docs04:158–176`、`docs03:29–30`）；20 worker 各自 consumer。

此候选不含 M3.2 全部持久 request_key/inbox适配器、M3.3 备份/导入、M3.4 运维。`docs/07-security-operations.md:57` 的离线一致备份与恢复新目录仍需独立实际演练，不能由普通进程重启代替；也不宣称 M3 整体出口、真实宿主或模型认证。
