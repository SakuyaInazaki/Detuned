# R23-B：C.3 契约与交付独立核对

日期：2026-10-03。仅只读核对产品与正式测试，报告属于 R23；不修改 C.3 历史证据、不作最终验收决定。全 29 命令由验证 Agent 独立运行，本子任务未重复执行 build/full tests。未运行 Node 22、干净安装、远程 CI、真实四宿主或模型。

## 结论与分类

R22-F03 的五处具体差异已修复，C01-8 有相应 HTTP 正反例；不据交付表错误否定产品业务可用性。C.3 原出口的完整契约覆盖与 E01 仍有明确欠项，宜在同一有限收尾包修复，不扩展新业务。

1. **正式完整性欠项**：`tests/contracts/r4-c-contracts.test.ts:428`、`:431`、`:550` 仍只检查 32/19 数量。C01-7 仅将 CreateSpace 的一个 body 与 protocol/HTTP 对比，没有完整实际 Fastify method/path 集合或全部 19 body 的对比。历史 AE03 探针能独立覆盖完整集，但不能代替要求的正式覆盖。
2. **非 body 共享与表达欠项**：`packages/protocol/src/openapi.ts:93` 与 `packages/server/src/routes/spaces.ts:24` 分别手写 limit；threads/posts/context 同样重复。仅 search kind 已共享 `POST_KINDS`。既有 `PaginationQuerySchema`（common.ts:23）未作为两入口共同来源；state/view 仍手写。OpenAPI 的普通 string 接受空白 cursor/q/Idempotency-Key，实际 string parser（utils/query.ts:132）与幂等业务（idempotency-service.ts:2591）拒绝空白；CSV 传输、重复参数、未知 query、三个 no-body 写接口 undefined/null/{} 政策未在生成规范描述/扩展。无需让标准参数 schema 冒充未知/重复 query 校验，也不新增 ID 前缀/UUID 要求。
3. **交付政策表实错，非新业务回归**：implementation-r4-c3/coverage-audit.md:57 列了不存在的 GET /spaces/{space_id}，遗漏实际 GET /me（meta.ts:26）；:60 threads 写 tags，实际只 state/limit/cursor（threads.ts:24）；:72 search 写 tag、漏 thread_id，实际是 tags（search.ts:22）；:74 views 写 limit，实际禁止全部 query（search.ts:54）。表也缺逐路由 params、公共验证来源、缺省/空值/重复值/未知字段及正式断言位置，:73 漏 focus_thread_id。
4. **E01 报告错误继续存在**：coverage-audit.md:38 写 r2-adapters 12 项，实际输出 3；:39–41 列三个不存在文件；:43 列不存在 core/tests；r3-regression/storage 数量亦错。180/13 总数与 observed-tests.txt 真输出一致（C27/B82/生成6），不能因分表错误否定总数。integrations/compatibility.json:4 仍 runtime v22.19.0+，未按要求分离 minimum_supported_node / actual_test_runtime。README/progress/reviews 索引仍 R22，符合保持独立结论的半项，但没有要求的 C.3 已实现自验待复核链接。docs/04-protocol.md:3 仍整体称待实现；:121–127 已有120000等待预算/退避清理，但没明确 timeout覆盖body、不自动重试及非法Retry-After后备。

## 证据准确性

- 本子任务计算 C.3 before/after 的 93 项哈希：确为6个变更，87不变；当前93项全部匹配 after。before与R22 baseline 的 product_and_test_file_hashes 完全一致。6文件声明准确。
- C.3 README/verification/baseline 的 HEAD 均 b8dacd56779a007a2e7045b682bca0c036fdfc44，已修旧HEAD误记；未据旧HEAD回退。Node v26.3.0/pnpm11.7.0 是交付记录的实际环境，Node22未实跑。before captured_at 沿用R22时间，应注明继承快照而非独立新采集时间。
- commands.json 有29条命令、真实时间/exit/stdout/stderr文件指针；独立重新运行及历史资产完整性由验证Agent报告。交付目录未包含可检查 runner/采集器，此为可复跑交付欠项，不能推断日志伪造。
- verification对AE02等小项名字/4xx检查的叙述与原AE输出需按observed逐项校正；不得改旧observed，亦不把摘要错写作功能失败。

## 原 C.3 提示词对应覆盖/欠项

| 原要求 | 覆盖事实 | 欠项/责任 |
|---|---|---|
| §0 93文件before/after、保留历史 | 6/87哈希与当前after匹配，before匹配R22 | before继承时间说明；历史完整性由验证Agent |
| §1 Pi七分支/八命令/执行与错误 | 交付AE04通过，正式C03-5新增 | 精确正式覆盖由Pi/客户端Agent，不在本报告判完成 |
| §2 正文控制/传输/等待矩阵 | 交付AE01/02/05及C02-12/13/14 | 正式时序与cause由Pi/客户端Agent |
| §3.1–5 五处AE03差异 | C01-8与源码分别关闭，匿名/订阅/poll一致 | 保留此结论 |
| §3 32操作四维表、共享约束 | POST_KINDS共享、body引用既有schema | 完整表纠错；复用既有limit/state/view/非空约束，描述CSV/no-body/未知重复query |
| §3 全route/19body正式比较 | 历史AE探针已有完整比较 | C01-7/8硬编码数量仍不足，正式测试Agent负责 |
| §4 精确每文件覆盖/runtime/状态/docs04/勘误 | 180/13总数与HEAD正确，真实宿主not_tested | 分表/分离runtime/docs04/索引自验待复核/旧C2新勘误 |
| §5 可检查采集器与全29命令 | commands有时间/exit/分离日志 | 交付缺runner；全量独立复跑由验证Agent |

## 最小拟改文件与修复办法

父 Agent决定实施/验收。建议一个明确的 protocol 非 body 契约模块（如 packages/protocol/src/request-policies.ts）导出既有分页范围/默认、thread详情默认50、context范围、revision最小值、state/view枚举与非空string/业务key schema；openapi.ts和server现有query helper/routes复用。这仅提取现行规则，不增加新规则、通用路由框架或迁移。新增schema必要时在protocol/index.ts导出。涉及 server utils/query.ts、routes/{spaces,threads,posts,search}.ts 的最小接线，params继续按现有string定义。

正式 tests/contracts/r4-c-contracts.test.ts 由另一Agent单独所有：借用AE03 onRoute采集模式，精确比较32 method/path和19 body结构，并增加既有非body规则代表正反例。交付新勘误与正确32清单在新目录保存，历史C.3材料不改写。当前说明最小修改 docs/04-protocol.md、integrations/compatibility.json、README.md、docs/progress.md、docs/reviews/README.md；可复跑runner在新交付目录保存。

## M2.1 依赖与实施边界建议

当前 identity/space membership、授权、写事务/事件/幂等、SQLite迁移与恢复基础已具备；protocol/artifacts.ts 仅实体schema，不能宣称已有附件存储。等待本次C有限收尾与独立确认后，可领取M2.1。只实现流式multipart上传、服务生成存储key、SHA-256/bytes、单文件25MiB及空间1GiB默认配额、ready后可引用、授权元信息/下载与孤儿清理；复用现有ACL/事务，保证并发额度与中断/DB失败不会留可引用半成品（T07），补无权下载T04。文件名只显示、禁止路径穿越/符号链接越界、attachment/nosniff，不执行内容或抓外链。文件与DB不能伪称单事务，明确临时文件→finalize→可清孤儿的恢复窗口并测试。仅space可见附件，评审私有状态保留未启用，M6不提前实现；不扩展M2.2知识/FTS、M3备份或M4专用工具。公开附件存储/schema边界若需新决定写ADR，同步契约示例测试。
