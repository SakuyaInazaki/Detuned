# M2.4-B.1 核心单元交付（待独立验收）

2026-10-06 恢复核查：继续 2026-10-03 已授权实现，不重做 before。本单元现有代码与冻结接口一致；恢复轮未改产品代码、正式测试或规范，仅新增复测证据与本交付索引。M2.4-A 的验收结论保持，B.1 仍等待第三 Agent 独立验收。

核心文件：`packages/core/src/services/context-service.ts`、`space-revision-read-service.ts`、`packages/core/src/index.ts`；正式测试为 `tests/integration/m2-space-revision-read.test.ts`（8 项）与获准适配的 `tests/integration/m2-context.test.ts`（7 项）；契约说明已在 docs/03 的 B.1 小节和 docs/12 的 ADR-028。

context 同快照读取内容修订、固定 ref 与 checkpoint seq；先测空可选数组的 inline 必需内容，超限才从完整候选整体省略 objective/rules，再按 activity→failures→blockers→pins 尾删。规则省略保留可容纳的可选材料，最低元信息仍超限为 422。

固定读取只导出 stored objective/rules 的 compact JSON 文档。每请求一次完整文档编码与 Buffer（O(doc)），完整末页仅在剩余原字节不超过预算时测量；非末页二分候选上界不超过本页预算，逐候选计完整真实签名 envelope。UTF8 边界、当前 ACL、严格绑定、首次 24h 期限续页继承、等号有效/+1 秒失效、换预算、坏游标统一 400 与无法推进 422 均在业务层处理；读取不写 entity/event/idempotency/ack。

S03 的历史首次扩展运行为夹具错误：SQLite TEXT 写入 objective 时已将孤立 surrogate 替换为 U+FFFD，规则 JSON 则保留孤立 surrogate。最终夹具按实际 stored 文档重组，并继续验证 rules 孤立 surrogate，不声称恢复已丢失字符；未改 SpaceService 或存储写入行为。

## 本轮复测

两条命令均 exit 0，stdout/stderr 分别保存；stderr 文件为空是实际观测。

- `pnpm exec vitest run tests/integration/m2-space-revision-read.test.ts tests/integration/m2-context.test.ts`：15/15，2 文件。日志 `resume-2026-10-06-tests.stdout.log`、`resume-2026-10-06-tests.stderr.log`。
- `pnpm --filter @detuned/core typecheck`：exit 0。日志 `resume-2026-10-06-typecheck.stdout.log`、`resume-2026-10-06-typecheck.stderr.log`。

正式覆盖包括：4KiB/64KiB/default 预算、实际 request_id 双层转义、emoji/空规则、固定 stored 文档与新版不漂移、签名非 UTF8 边界、两次非末页及推进 Clock 后 exp 保持、换预算完成、每页撤权先验、optional 保留、最低 metadata 422 无写，以及旧 WAL 同快照 ref/seq 接续与尾删来源状态。

## 原证据索引（全部保留）

- `before.md`、`before.log`：旧实现 S01/S02 两项实质失败。
- `after-initial.log`：初始 S01/S02 2/2。
- `after-expanded.log`：扩展正式集 14 通过/1 夹具失败；未覆盖该日志。
- `after-final.log`：修正 stored 值夹具后 15/15。
- `core-typecheck-initial.log`、`core-typecheck-expanded.log`、`core-typecheck-final.log`：原各阶段核心类型检查记录。

本轮未运行全仓 build、fullsuite、当前 29 命令、真实宿主/模型、Node22/干净安装/远程 CI 或长负载；统一验证由独立 Agent 执行。无 DDL/迁移、依赖安装、commit/push、全局配置或 B.2 正文续读实现。下一步：停写本单元产品/tests/docs03/12，交父代理与独立验收方核查。
