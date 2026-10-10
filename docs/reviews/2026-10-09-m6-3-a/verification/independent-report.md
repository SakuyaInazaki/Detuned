# M6.3-A 独立功能验收

独立结论：当前冻结源码通过内部评审定案、有效性状态、材料失效事务及 schema5 维护的有限验收，提交根代理判定。外部评审 HTTP/CLI/Web/MCP 入口、实际检查收据和整个 M6/M7 尚不在本次通过范围内。全部执行使用既有本机 Node/pnpm，单一窗口、workspace concurrency=1、Vitest worker=1 且文件串行；没有 VM/Colima、浏览器、安装或模型操作。

## 版本与实际门禁

A 最终 [v2 冻结](../author/finalization/freeze-manifest-v2.json) 17 项、B 最终 [v2 冻结](../author/storage/freeze-manifest-v2.json) 28 项均逐项匹配。A 的修后产品差异只有 fresh submit 的 stale 分支；B 的修后差异是 schema checker 的七表与两索引严格比较。最终构建覆盖 A v2 的运行时代码；B 后续仅 checker JS 修复，由最终 lint 直接执行，无需重复构建和类型检查。

| 检查 | exit | 秒 | 实际结果 |
|---|---:|---:|---|
| 全 workspace 串行 build | 0 | 10.483 | 全部子步骤完成 |
| 全 workspace 串行 typecheck | 0 | 8.207 | 项目检查通过 |
| 修后全 workspace 串行 lint | 0 | 8.289 | schema checker 严格同步 |
| 最终完整 core | 0 | 257.199 | **790/790，122 files** |
| current25 | 各 0 | 合计 18.710 | **25/25**，各一次 |
| 原 schema4 backup API → 当前5 restore | 0 | 0.401 | 单条真实维护探针通过 |

完整命令、stdout/stderr 与版本组合见 [gate-summary.json](gate-summary.json)、[gate-output-audit.json](gate-output-audit.json)。所有新增正式源别名 noEmit 检查均通过；根项目 typecheck 与额外测试源检查分别留据。

790 相对前包 766 增加：A9、B6、D8 共 **23 个新测试、6 个新文件**，以及原 schema-generation 文件新增 V5 参数一例。新23定向首次20通过、3个 D challenge 夹具失败，修后只复验这3个并通过；最终完整套件23个均通过。core 首次为 **788通过、2失败/790**，两个旧 D 维护夹具仍期待当前4。根批准仅三处当前目标4→5及标题说明，真实 source3、原确认与 compact ref 字节等断言保持；定向2/2后完整套件790全绿。[首次完整输出](core-first.stdout.txt) 与 [最终输出](core-final.stdout.txt) 均保留，不能称首次全绿。

current29 是四门禁与25探针的组合，不加入 core 测试计数。25中为 **6原脚本、4既有获准 adapter、15本包 schema5 副本**；后15相对已封存 schema4 版本12实改、3同 bytes。改动限第七表历史投影、历史4/profile输入与当前5目标，预算与业务断言保留。见 [manifest 与逐项来源/差分](current29-manifest.json)、[完整输出核读](current25-output-audit.json)。#28 原 Ajv 输出 ignored date-time format 警告；该项通过不能充当 date-time 格式验证证据。

## 独立功能证据与首次反例

两个独立正式文件为 [DF01–06](../../../../tests/integration/m6-review-finalization-independent.test.ts) 和 [MS501–502](../../../../tests/integration/m6-schema5-maintenance-independent.test.ts)。使用真实私有 WAL SQLite 和实际业务服务，研究内容均为 synthetic fixture。

- 当前 ACL、凭据与 finalizer 权限在历史 same-key 重放前保持有效；重放不以后来的 reviewer 资格或新规则改写原决定。严格 DTO、scope 隐藏、read-only 拒写和错误顺序均有真实对照。
- negative verdict 优先于检查未完成与 open challenge；允许未解决 challenge 的 policy 可以生成 accepted 决定，但当前有效性仍为 challenged。冻结 required_checks 没有实际收据时不能误验收。
- 真正 PostService/SpaceService/RedactionService 变更与 stale 历史、事件同事务提交。最后事件写入故障使原材料变更及其状态、副作用一起回滚。pinned-only 与无关帖子不误触失效；真正红删后 status 可以安全 invalidated，普通材料/getDecision/replay 仍拒绝410。
- 两个实际 Node 子进程分别竞争 finalize-vs-revision 和 finalize-vs-challenge，断言允许两种合法序，不固定赢家。决定先提交则 immutable 记录保留、后来 status 失效；变更先则定案拒绝且无半决定/key/event。受测子进程自然 exit0、signal=null，finally 有界清退；不声称实验观察到了两种不同赢家。
- 十二 reason 的顺序、去重、优先级，sealed/unused 私有材料不泄露、revealed 明确 evidence 的 missing/redacted 状态、安全 corrupt-reference 拒绝、无正文公开通知及 thread filter、ACK 不自动推进均有独立断言。missing 为实际标准状态，不扩 ArtifactState enum。

DF03 追加的真实集成反例首次收到 **VALIDATION_ERROR400**，契约要求 SNAPSHOT_STALE409：[首红](df03-stale-submit-first.stderr.txt)。原因是新持久 stale phase 被旧 submit 的 phase 校验先拒。A v2 仅 fresh 分支修复，修后 DF03 1/1通过，并检查无 submission/key/event 新增；最终完整套件再次覆盖。修后 case 断言安全 error code，409 映射由源码确认，并非另存了一份序列化 error status 响应。[修后记录](df03-stale-submit-v2.json)。原 private upload 相关3例在修前已实际通过，未扩大其产品源码。

另三例 D 夹具修复改为真正 writer 创建 challenge source 再建 relation，不升权或削弱原状态断言。DF04 首失败仅捕获 mutation.ok=false，没有 native code，只按同路径源码归因，不填虚构403。首次 lint 失败是 checker 尚期待六表，B 修为完整七表与两索引；原严格比较与历史 profile 保留，schema-generation 正式9/9通过。所有首次与窄修差分留存。

## 原4来源与维护

[原4冻结闭包 manifest](old-schema4-review-runtime-manifest.json) 包含77 JS、4 package metadata，逐项命中 fresh dist；必要 blob helper 后补捕获也精确命中 fresh。它是旧 schema4 的实际维护/业务 API 闭包，不冒称整个历史部署认证。真正原4服务生成 [持久无秘密 oracle](../../../../tests/fixtures/historical-v4-review-history.json)，包含 collecting/cancelled/sealed/revealed 历史、固定 roster/group/session、compact refs 与精确原响应；没有 token 或 instance secret。

MS501 实测原4复制升级新stage5、源 hash 不变、ordinary init/serve 拒 legacy4、历史响应 strictDeepEqual、refs byte保持。MS502 实测当前5七表历史、immutable decision、私有 blob 物理备份恢复、旧凭据失效和 sealed/unused 隐藏。

额外获准的 [单条 genuine 维护探针](maintenance-original4-backup-receipt.json) 使用冻结原4 backupOffline 生成原4备份，再由当前5 restoreBackup 恢复至不存在的新目录。原 source/backup 未变、七表（decisions 空）、compact refs/确认原样、三份 private blob SHA 匹配、secret 轮换/旧 token 拒绝、sealed 和 unused 对普通 reader 隐藏。owned 临时源、备份与恢复目录 finally 删除。此探针不增加正式 case 数，不是 UI、模型或生产研究数据演练。

## 静态差分、保护与限制

实际审阅 finalization/status/submission 的事务及 replay 顺序，结合 [A 源审](finalization-source-review.md) 与 [存储生命周期源审](storage-lifecycle-source-review.md)：当前权限和 facts 同读快照；fresh 定案与全部资格/材料/异议同写事务；intrinsic 历史验证与在线 privacy 分离，没有 core 反向依赖 review module。未发现仍可证明的范围内阻断。

[完整保护清单](integrity.json) 核对 **9305 份旧 review** 全匹配，含完整 M6.2-A 513 文件。授权集合为36个既有源/测试路径改变、14新增，越界集合为空；A/B 最终冻结全匹配。HEAD 与 lock 不变；旧 archive/SQL、历史 schema1–4 profile 原字节保持，current5 SQL/生成 profile 是明确批准变化。packages 与 modules dist 都纳入库存，91路径为实际构建变化。文档61+状态5在此时仍为前包状态且未改，后续由 A 单一 metadata 收口再末核。

pnpmfiles 状态警告、Vite 673.40 kB 大 chunk 建议和 #28 格式警告如实保留。没有为消警告安装、改预算或重复成功门禁；没有本包浏览器/性能/M7实评。新 HTTP 接入尚待下一包。原4/新5私有 fixture、两子进程与额外维护 tmp 已清退；既有 Colima 保留且本包完全未操作。

下一 fresh 可捕获的既有源码候选按 [根批准 ownership](../planning/file-ownership.json)：protocol review/response-guards/openapi/index，review module submission/index，server app/routes meta/artifacts/package.json，core artifact-service，client client/request-key/artifact-transfer，以及 lock 和最终 metadata。新 routes/reviews.ts、三个 HTTP/client/独立测试若届时仍不存在，只记 missing；此清单不授予当前实施或提前 fresh。
