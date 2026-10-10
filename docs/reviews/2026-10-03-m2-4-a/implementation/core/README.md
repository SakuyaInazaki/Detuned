# M2.4-A Unit A 实施交付（冻结，等待独立验收）

2026-10-03；本机Node26.3.0、pnpm11.7.0。父裁决接口见本包planning/core.md及planning/contracts.md；本报告不代替父验收。

## 改动范围

产品4文件：

- packages/core/src/ports/storage.ts：同步同连接readSnapshot契约。
- packages/storage-sqlite/src/sqlite-storage.ts：实际db.inTransaction嵌套沿用、独立deferred；同步thenable误用检查。未加DDL/连接query_only。
- packages/core/src/services/context-service.ts：第四参数必需budget.request_id、第五Clock默认SystemClock保持原构造；当前授权/规则/材料/seq统一快照，退出后签真实checkpoint；独立bounds、focus显式400、完整共享envelope计量、尾部整项删除与mandatory超限422。
- packages/core/src/services/event-service.ts：只checkpoint消费verify传floor(clock秒)，poll/ack其他逻辑未改。

正式测试2文件：新增tests/integration/m2-context.test.ts（7项）；按授权最小适配tests/integration/m2-knowledge-views.test.ts（budget/meta与V06整pin删除，64KiB40来源控制组）。规范2文件：docs/03-data-model.md同步A/B界线，docs/12-decisions.md新增ADR-027。未改B协议/server/client、其他旧正式测试或任何旧probe/证据。此单元8个产品/正式测试/规范文件，不包含新规划/证据；整包文件计数等待独立方。

## before/after证据

before.md与before-confirmed.log保留旧实现2/2失败；after-expanded.log新7+knowledge7共14/14通过。C01实际观测：before旧rules+seq2、订阅poll[]；after同旧rules+seq1、订阅poll拿到seq2 space.revised。C02合法大规则旧版4096仍成功，现在422。初轮after-initial.log 9/9也保留，最终采用14/14，不累加为重复数量。

有限命令：

- `pnpm exec vitest run tests/integration/m2-context.test.ts tests/integration/m2-knowledge-views.test.ts`：14/14、2文件；source alias，无workspace build。
- `pnpm --filter @detuned/core typecheck`：exit0，core-typecheck.log。
- `pnpm --filter @detuned/storage-sqlite typecheck`：exit0，storage-typecheck.log。

C03覆盖4096/65536/default及非法数/null/字符串、focus/先授权；C04用真实标准HMAC→EventService.subscribe在exp等号成功、exp+1失败，签名位于事务外；C05嵌套外层write不早提交、异常/thenable后连接恢复；C06精确边界逐尾删顺序及保留历史null/40source；C07成功/超限无实体、event、幂等、ack写。实际HTTP raw body字节与工具meta由B正式测试覆盖，不把core重建编码当作该层验证。

## 限制与冻结

此时Unit A产品/测试/规范停止写入，等父独立验收；没有自行全suite/29、统一build/lint、真实宿主/模型、Node22/干净安装/10万或长压测。历史JS若直接getContext不传budget将失败：不能假ID回退，旧探针保留且只允许另外当前版本化适配。readSnapshot是调用方同步只读约定，并非数据库强制只读。大必保规则422为A阶段显式边界；固定规则引用/继续读取仍M2.4-B，不宣称完整T06/M2.4完成。
