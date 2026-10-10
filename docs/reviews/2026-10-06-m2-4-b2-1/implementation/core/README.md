# M2.4-B.2.1 核心交付（待独立验收）

2026-10-06。唯一父冻结方案见planning/interface-freeze.md。本单元实现固定stored帖子修订五字段JSON内容续读；每页同snapshot current身份/space read ACL→目标归属/lifecycle→cursor→固定材料，redacted410、withdrawn明确可读。当前kind/head/lifecycle metadata不进入固定拼接文档。UTF8 byte分页、实际完整envelope/req.id/签名与双层转义计量、首次24h期限继承、无法非空推进422与O(doc)边界按B.1机制实现，不抽泛化框架。

产品/测试/规范改动仅：新 `packages/core/src/services/post-revision-read-service.ts`、core/index必要导出、新 `tests/integration/m2-post-revision-read.test.ts`（10项）、docs03新增B.2.1合同、docs12 ADR-029。未改StoragePort/SQLite/PostService旧写入、旧正式tests、SQL/DDL/依赖。协议/server/client/CLI及其新contracts由另一单元负责。

## 有限真实检查

- `node docs/reviews/2026-10-06-m2-4-b2-1/implementation/core/before.mjs`：exit0。既有固定revision HTTP200返回完整stored五字段、50000字节body、compact全文65725bytes>4KiB，无meta；新route/tool/CLI反例由协议单元另保存。token只在内存，SQLite隔离内存，无仓库凭据。
- `pnpm exec vitest run tests/integration/m2-post-revision-read.test.ts`：最终10/10，1文件，exit0。`after-final.stdout.log`/`.stderr.log`；stderr实际为空。
- `pnpm exec tsc --project /private/tmp/detuned-b221-core-source-tsconfig.json`：exit0。该实际配置完整保存在 `source-typecheck-config.json`，覆盖core/src并paths指向protocol/src、继承仓库strict/noEmit；没有隐式build或读取旧protocol dist声明。stdout/stderr为 `source-typecheck-first.stdout.log`/`.stderr.log`，实际均空。

P01覆盖4K/64K/default及控制字符/Unicode/双转义，明确断言整个chunk外层JSON超64K、64K仍多页、每页预算与完整stored重组。P02实际调用既有PostService.createRevision更新head，旧固定文档不漂移而后页has_newer_revision更新。P03/P04历史structured额外/非法当前新写类型及孤立surrogate按stored值、空body；P05withdrawn与中途redaction410；P06签名/绑定/UTF8位置/严格字段；P07当前ACL/身份/目标归属先验；P08多非末页/时钟推进/初exp/换budget/等号/+1；P09全库无entity/event/idem/ack写及最小metadata422；P10双WAL受控redaction在读材料前提交，旧快照active+原body一致、下次410。

## 首失败与修正（旧日志完整保留）

`after-first.stdout.log`/`.stderr.log`：8过/2夹具失败。P02最初误写不存在的revisePost方法，修为真实createRevision；没有据此改产品。P08最初复用了控制字符双层转义总量>64K夹具，错误要求两4K后换64K立即结束；仅改TTL专用stored body，使该项明确检验两非末页→换64K完成。原控制字符/双转义/64K仍多页及完整重组仍由P01显式保留，并未删去超64K覆盖。`after-fixture-fix.stdout.log`/`.stderr.log`为10/10；随后P01增加上述明确多页断言，`after-final`再次10/10。正式项始终10项，不重复累计。

## 准确证据索引与限制

本目录before.mjs/before.json/before.stdout.log/before.stderr.log；after-first、after-fixture-fix、after-final各stdout/stderr；source-typecheck-config.json及source-typecheck-first stdout/stderr；本README。新日志独立保存，旧包全部证据不覆盖。

未跑全suite/current29/workspace build、SR/SQ/KV重跑、真实宿主模型、Node22/干净安装/远程CI/100k；统一冻结后独验由第三Agent执行。三遗失真实历史HTTP夹具持续not_run，不伪造M2.1构建/hash/原字节回放。O(doc)每页编码与成功compactHTTP预算不覆盖header/error/SDK包装；主题聚合/旧裸cursor与B.2.2未实现，不称完整T06/M2.4/M2完成。无commit/push/清理/安装/模型/全局配置/deepseek-brainstorm。

本单元产品/tests/docs03/docs12冻结停写，交父代理与独立验收。
