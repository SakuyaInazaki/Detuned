# M5.1-D.1 独立验收

结论：当前两个只读目录 API 可接受本包有限范围。根 build/typecheck/lint/fullsuite 首轮均 exit0；核心 **684 tests / 101 files**（原675加新A5/B4），current29 **29/29实际执行通过**。独立真 SQLite/loopback HTTP probe **五组首轮通过**，app/DB关闭、私有temp删除全部 true。没有重复成功 gate，没有运行浏览器、安装或模型。

| 实际检查 | exit | 时长 | 证据 |
|---|---:|---:|---|
| root build | 0 | 5.710s | [stdout](gates/root-build-first.stdout) / [stderr](gates/root-build-first.stderr) |
| root typecheck | 0 | 4.975s | [stdout](gates/root-typecheck-first.stdout) / [stderr](gates/root-typecheck-first.stderr) |
| root lint | 0 | 4.858s | [stdout](gates/root-lint-first.stdout) / [stderr](gates/root-lint-first.stderr) |
| root core full | 0 | 43.691s | [stdout](gates/root-full-first.stdout) / [stderr](gates/root-full-first.stderr) |
| 独立实际 HTTP/SQLite | 0 | 0.411s | [完整输出](gates/independent-native-first.stdout) / [stderr](gates/independent-native-first.stderr) / [结构 receipt](independent-catalog-first.receipt.json) |
| current25 probes | 全0 | 各有 receipt | [current29完整清单](current29-results.json) |

完整 stdout/stderr 均保留并核审；[四gate输出审计](gate-output-audit.json)、[25probe输出审计](current-probe-output-audit.json)绑定完整字节数/SHA，不只看尾部结论。current29组合为四个本包 root gate 加25探针；探针21原脚本、4个沿用已批准 #11/#27/#28/#29 adapter，未新增适配或改旧脚本。#28的66条 AJV date-time ignored warning、真实 pnpmfiles changed warning、Web519.84kB bundle提示均保留，不写无警告。标准pnpm脚本使用空 user/global npm config、CI与原 HOME。

五组独立检查使用 [自有 probe](independent-catalog-probe.mjs)，全部私有SQLite真实DB与Fastify真实HTTP，先合法HTTP建普通human、observer和帖子，再用受控 Clock 补既有默认写桶，不修改全局时钟：

1. **修订目录**：普通human真实写24版本、每个正文30018 UTF-8字节；observer真实读目录，完整wire含api_version/request_id/meta/签名cursor≤4096，byte trimming后两页严格24→1连续无重无漏。实际捕获两条参数化SELECT只投影revision/editor/time/hash，并在目录阶段将旧 `getPostRevision`/`listPostRevisions`设为抛错；合法读取仍成功。此证明目录路径没有全文读取，不是整个SQLite进程的绝对CPU/内存上限。
2. **附件目录**：仅自有DB放 synthetic historical 登记/关联，仿历史可保留字段；没有运行logical importer、上传或下载。27可见、2 private/crossspace关联；含多字节purpose，五页读全、最大完整wire4089字节，无重无漏。missing33554432字节及空/custom purpose原样保留；redacted严格只有id/state，完整wire不含独特残余hash/mime/purpose；private/crossspace连ID都不披露。单项过4096预算真实422 QUERY_TOO_BROAD、不存在固定revision真实404。receipt中的 historical_import_fixture 标签仅指该仿历史字段seed，不能理解成运行了真实import。
3. **cursor**：数量limit2保false+cursor与byte裁剪语义分离；actor/post/space/purpose及附件精确revision绑定均真实拒400，含当前私有实例secret签名但错域payload。TTL86400，续页exp不延长，exp等号可读、+1秒400；注入Clock后恢复自有fixture阶段基准，不碰系统时间。
4. **当前权限/脱敏**：strict未知query、limit0、4095预算、坏cursor拒400；无权空间404隐藏。撤成员后原cursor404、撤凭据后401 UNAUTHENTICATED；post设redacted且DB原hash仍残留时，两目录均410且完整wire不泄原hash。该脱敏状态是自有DB控制fixture，不冒称已跑管理员脱敏工作流。
5. **兼容/副作用**：恢复拦旧全文方法后，真实旧full revisions端点仍返回24条完整原正文；writer两新目录正例成功；读取前后posts/revisions/associations/events/idempotency/sessions计数完全不变。所有私有token均不在真实requestLogSink中；probe未把请求头、token或instance secret写证据。

目录只查固定修订关联，不能称全space附件列表。ready/missing仅数据库登记状态，不能据本包称文件存在、hash已核、原件可下载；下载仍是旧固定HTTP/FS校验。

A7和B8冻结文件全匹配，见 [freeze-audit](freeze-audit.json)。产品源码与新正式tests由root各包编译检查，作者额外含新test source noEmit A首0、B第三次0，独核配置确实包含新test；B首路径配置/第二类型名diagnostics完整保留，[作者原结果](../author/protocol/results.json)。根tsc不包含这些test，不混称其检查域。D自有probe为mjs，准备时node --check0及最终真实执行0，不冒称它有TypeScript noEmit。

[保护核验](integrity-before-metadata.json)：source/config/test **304→308**，仅授权11已有路径变化、4新服务/协议/test路径，无越权。原13份 [before manifest](before-files-manifest.json)全部匹配fresh；posts.ts/request-policies.ts未改。父另批准artifact-transfer三个诊断文本：作者提供精确旧字面量后反转现bytes，SHA `1c083c1292276728adf334a89831617880dba132bd2176966f453b9e3b394a0b`精确命中fresh原hash，才作为[后取得哈希核准重建 supplement](before-artifact-transfer-supplement.json)保存；不是fresh时复制。 [准确三处diff](artifact-transfer-only-diagnostic.diff)确认只中性诊断，不改reader限额/EOF/取消机制。[完整源差分](source-delta.patch)可审阅。

旧review **7110**、SQL/archive **4**、schema **2**、HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44`、实际lock `49c72b4c1b0a127c9715e96d4eef06b99d645440e2aaf3de13b3fd86be4fa006` 守恒。Web源/三browser文件/config、依赖均未改；本包未重跑C浏览器十一条。root构建自然更新dist：tracked29改、untracked7改9新1删（新增两个模块8产物及Webbundle替换），不冒构建后dist不变。当前外部docs58/mutable5功能期未动，metadata待父接受后收口。

实际差分审阅已覆盖以下授权落点，未展开全仓审查或加跑测试：

- `core/services/post-catalog-read-service.ts`：每页 refreshContext、observer空间权限、post归属/lifecycle与目录查询在同一同步readSnapshot；附件先窄getPostRevisionMetadata确认固定ref。预算裁尾后以最后实际输出revision/id签cursor，exp沿首；不是storage未裁尾cursor。
- `storage-sqlite/sqlite-storage.ts`与`core/ports/storage.ts`：新增三个窄port；revision SELECT仅四metadata列，limit+1/keyset；附件JOIN先过滤同space/space visibility再分页，CASE不将redacted残余字段取入JS，并仅输出id/state。旧全文get/list代码保持，未DDL。
- `server/routes/posts.ts`与`server/app.ts`：新增service组合/decorate与两个GET接线；query共享严格解析，实际req.id进入完整wire序列化预算。旧完整revisions与固定正文route留原实现；真实旧HTTP正文对照已验证。
- `protocol/post-catalogs.ts`、`response-guards.ts`、`openapi.ts`、index：新DTO/query/cursor与三分页meta分支独立；OpenAPI用canonical单源；date-time仅内部派生两已知created_at位置，Value.Check保其余严格约束，再已锁定full谓词逐项检查，没有全局registry、输入转换或schema变异。
- `client/client.ts`、index与诊断supplement：两新GET薄wrapper走既有1MiB boundedJSON executor，校验严格page/date和请求post_id/ref绑定；旧listPostRevisions原路径/执行器保持。共享reader仅三条中性诊断文本变更，限额/EOF/取消机制精确before diff不变。

没有发现必须修正的当前产品反例；不以作者自报代替以上独立实际结论。

范围限制：动态单页目录不是跨页固定快照；D使用真实HTTP核服务/SQLite，客户端负面流与格式分支由本包正式4case及旧核心回归覆盖，不冒它为native宿主或浏览器验收。本包不改Web/DDL/deps/CLI/MCP；无生产TLS、模型账户、用户profile或外网服务。下一 D.2 才完成Web修订/证据发现、上传绑定和差异旅程；M5其余工作与M6/M7仍待完成。此处不提前写下一包实现成功或创建fresh。
