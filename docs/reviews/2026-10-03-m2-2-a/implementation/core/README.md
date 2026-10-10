# M2.2-A Unit A：已冻结，等待独立验收

本单元完成四类型新写统一结构校验及固定证据引用校验；不实施知识视图。父代理最终验收结论另行记录。

## 变化

- 新 `packages/core/src/services/typed-write-validation.ts`：调用协议唯一 parser；仅实际 source/evidence 引用需读时刷新当前身份并检查读取权限；固定 post_id/revision 同空间、存在，授权后 redacted 410、错误版本/跨空间404；withdrawn 可读旧版本允许。验证后 structuredClone，不裁剪或补默认。
- `post-service.ts` / `thread-service.ts`：仅四类型新 action 检查；修订 kind 来自 DB；原 req 直接进入既有 hash/replay 管线，已有成功 key 不执行新结构/引用验证。其他 kind 原规则保留。
- `artifact-references.ts`：抽出只检查的 assertRevisionArtifacts，关联写入仍原事务内一次执行；无异步 FS。
- 新 `tests/integration/m2-typed-writes.test.ts`；docs03 新写/历史边界及 docs12 ADR-024。
- 未改 SQL/schema/迁移、幂等实现、旧 probe、状态入口、server/CLI/FS。

## 定向验证

本机 Node v26.3.0、pnpm11.7.0；没有 Node22 或真实四宿主实测。

| 证据 | 结果 |
|---|---|
| before.log | 初始反例运行8失败；其中撤回输入缺 expected_revision、SQL列名 request_key 为夹具错误，后纠正 |
| before-corrected.log | 修实现前8/8失败，显露旧弱初始failure、未知字段、缺证据条件、未验证固定引用及新key旧宽输入接受 |
| after.log | 新 typed writes 12/12 + 原 M2.1 core 9/9，共21/21 |
| typecheck.log | 临时/tmp config未指定项目typeRoots，出现Node类型解析错误；非产品类型错误 |
| typecheck-source.log | 修正临时config typeRoots后 source core+protocol tsc通过 |
| typecheck-package.log | `pnpm --filter @detuned/core typecheck` 通过；协议 Agent 已先定向build protocol |

未跑完整29、完整workspace build/test；交由父代理独立验收。本单元没有构建core dist。

## 正式覆盖

T01 初始failure缺state无半状态；T02 四类型×三入口未知字段400与合法写入、保留原文本；T03 provided空/假ref、unverified空白reason、非法枚举/元素/长度；T04 固定旧版不漂移、撤回仍可读、错版本/跨空间404、脱敏新引用410、未知ref键400、历史source不重新验证；T07 failure/summary错误固定版本×三入口全部回滚；T08 现有能力403与成员撤权后原key404；T05/T06 三入口旧成功宽payload同raw/key重启重放、记录不变、新key拒绝、变化409与脱敏墓碑投影。M2.1 core9条保留流/配额/恢复/引用回归。

## 历史夹具来源与保真

`fixtures/legacy-thread-service.ts` 在修改产品前复制当前已验收M2.1 source，仅改相对import和类名；`fixtures/legacy-post-service.js` 在M2.2构建前复制已验收M2.1 dist，仅改helper import/类名并去source-map注释。夹具实际调用旧服务和现有原子幂等管线产生成功实体/event/ref/hash，不修改stored hash、不手写成功记录。新正式测试自包含临时库，不依赖此次独立验收/tmp数据库或token。

- thread fixture SHA256 `408328902c356c1610bb68605639e3b5043abe3e88e5faa260aafa630e40bdd8`
- post fixture SHA256 `63888521f6d792785a149bd246f2a9a7735faee180b96431559eaf25f531e7ec`

事实：现 `requireSpaceAccess` 对 contributor 本身要求 read+write（auth-service:175附近），没有已有write-only成功路径。helper不吞全局401/403为404。旧帖子幂等脱敏采用存储墓碑投影，测试遵从既有策略而不把它改成410；新引用授权后脱敏410。provided不代表独立验证，环境/预算文本不由关键词或模型裁判。
