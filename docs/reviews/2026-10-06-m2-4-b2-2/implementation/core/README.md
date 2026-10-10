# M2.4-B.2.2 核心交付（待独立验收）

2026-10-06。独占实现：新ThreadPostsReadService、core/index必要导出、新m2-thread-posts-read正式业务文件10项、docs03合同与ADR-030。精确路径和sha256见freeze-manifest.json。未改旧formal/Port/SQLite/PostService/ThreadService/SQL/DDL/依赖。

新目录只读取现Thread/Post metadata，同snapshot refresh身份→space ACL→thread归属→query/cursor→limit候选。当前状态跨页可变，非固定全集。storageHasMore仅布尔，预算逐尾裁整项、每候选计真实完整签名envelope，cursor始终取最后实际发送id重新签名，保证静止集合不跳裁项；truncated只预算裁剪，limit有更多仍false/cursor，空线程false/null，有候选无法一项推进或空metadata不fit422。strict用途/actor/space/thread/sort/after_id/expiry，首24h沿链、预算和limit可换，签名下界不requireDB行存在。无正文聚合、过滤、scan/Port扩展、event/idem/ack写。

## 命令与真实结果

- `node docs/reviews/2026-10-06-m2-4-b2-2/implementation/core/before.mjs`：exit0，旧GETthread合法limit100返回60项metadata、17913 compact正文bytes>4K；rawcursor7+53完整静止集合、max_bytes query400；before.json与stdout/stderr保存。token仅内存、SQLite内存。
- `pnpm exec vitest run tests/integration/m2-thread-posts-read.test.ts`：首跑10/10，1文件，exit0，after-first.stdout.log/.stderr.log。无首失败或重跑；stderr实际空。
- `pnpm exec tsc --project docs/reviews/2026-10-06-m2-4-b2-2/implementation/core/source-typecheck-config.json`：首跑exit0，source-typecheck-first.stdout.log/.stderr.log实际空。配置继承仓库strict、覆盖core/src并指向protocol/src、noEmit，未用旧dist声明或隐式build。

## 正式覆盖

D01原storage无next但budget续读与4K/64K/default真实转义request_id字节；D02原limit+1 last不跳尾与limit1/100、动态换limit/budget静止集合完整无重漏；D03空页/metadata422；D04archived/withdrawn/redacted仅metadata无body；D05严格签名/绑定/未知/TTL/不存在after_id合法parameterized下界；D06当前身份/读capability/member/目标归属先验；D07两非末页推进Clock保持初exp、换limit/budget、等号/+1；D08目录固定ref实际接B.2.1旧正文，head更新固定、之后redaction410；D09全库fingerprint成功/validation/ACL/422无写；D10双WAL barrier同页旧thread state/version与旧post head/lifecycle、次页新状态（不称冻结全集）。

## 完整证据与限制

本目录仅before.mjs/json/stdout/stderr，after-first stdout/stderr，source-typecheck-config.json及source-typecheck-first stdout/stderr，freeze-manifest.json与本README。原before与所有旧包证据保留，无失败日志需掩盖。

本单元未跑workspace build、fullsuite/current29、原PR/SR/SQ/KV、真实SDK/Pi/MCP/CLI跨入口、真实宿主模型、Node22/干净安装/远程CI或100k；协议单元与独验负责其相应范围。三遗失原真实历史fixturenot_run不伪造，fresh保护清单动态捕获，不复制2492/2344作为下包数。每页limit候选有界不称SQLVM/CPU硬限，成功compactcap不含header/error/SDK，focus与规模/全T06/M2.4/M2后续。无commit/push/清理/安装/global/模型/deepseek-brainstorm。

产品/tests/docs03/ADR冻结停写；父依据第三Agent统一验收决定是否接受此包。
