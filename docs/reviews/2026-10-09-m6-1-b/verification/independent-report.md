# M6.1-B 独立功能验收

2026-10-09。D 建议接受本包有限 schema3/材料快照持久化/请求 collecting 与取消能力；最终根验收及 metadata 尚待完成。没有公开 review HTTP、提交意见、封存揭示或 M6 全功能通过声明。

## 实际版本与统一门禁

A v4 `author/request/freeze-manifest-v4.json`（11 文件，SHA `3c002f655600b4bed054bc630ac2cd9c727be249b3dfc52bb5157642cf26d036`）及 B v3 `author/protocol/freeze-manifest-v3.json`（27 文件，SHA `c18da1e07c3f372f6ff6aa6cd97b95fb657f3b210e74092827b496f339a68852`）逐项当前哈希全匹配。独立正式源为 `tests/integration/m6-review-requests-independent.test.ts`。记录见 [最终保护](functional-integrity-final.json)、[完整输出审计](gate-output-audit.json)。

| 最终检查 | 实际结果 | 日志/回执 |
|---|---|---|
| 根 build 展开为递归完整脚本，workspace-concurrency=1 | exit0，9.847s | [build](root-build-M01-serial.json)，同名 .log |
| 根 typecheck，同上串行 | exit0，7.983s | [type](typecheck-M01-serial.json)，同名 .log |
| 根 lint，同上串行 | exit0，8.378s；schema.sql/schema.ts 精确同步 | [lint](lint-M01-serial.json)，同名 .log |
| 五个受影响文件（B 三夹具及 A/B 新 M6 作者测试） | 33/33，5 files，exit0，8.492s | [定向](M01-fixtures-adjacent-targeted.json)，同名 .log |
| 最终完整 core，maxWorkers=1、文件不并行 | **737/111，全通过，exit0，249.35s**（Vitest248.66s） | [core](core-M01-serial.json)，[完整 stdout/stderr](core-M01-serial.log) |
| D 新源 noEmit | exit0；DI07 修后源检查也 exit0 | independent-noemit-first.log、DI07-fixed-noemit.log；不是 runtime transpile 冒类型通过 |
| 当前25探针 | 实际25 exit0；本次 M01 后不无故重复 | [current29](current29-manifest.json)，current-05…29-first.json/.log |

已完整读取最终门禁输出及 exit；仍有 pnpm `The list of pnpmfiles changed` 警告，无隐式重装；Web build 有 >500kB bundle 提示。未安装依赖、未使用 VM/容器/浏览器/模型、未改全局配置。四根脚本全保子步骤，以已安装 pnpm 的 workspace-concurrency=1 限内部并发；core 原 timeout/断言不变，真实竞态所需两个短寿命子进程保留。

计数来自实际日志：新三个正式 M6B 文件为作者 request **7**、maintenance **5**、D independent **7**，合计 **19 新 case/3 files**。原有 schema-generation 新增 V3 参数 case **1**；因此 717/108→737/111 增20。首次 core735 中 D 为6、generation为6；最终各为7，735→737恰为 **DI07+V3生成参数两个 case**，不是重跑计数。初次 core 非全绿：sandbox loopback/Unix socket EPERM 与三处旧 schema 夹具失配等，735总/537通过/198失败保存在 test-first.log/.json；不能称首次737全绿。

## 独立真实行为

DI01–06 首次 source 6/6，1.813s，最终完整套件也全过。fixture 是明确的可信私有 SQLite 研究/凭据种子，除 DI04 与维护/CLI 外不冒称 HTTP/部署场景。

- 真实 membership、eligible、disabled actor、历史贡献者、独立组及同一 actor 两 session 检查；重复 actor/session ID 不凑名额，拒绝前后全部表计数不变。
- 在真正 SQLite 最后 idempotency INSERT 设置故障 trigger，snapshot/items/request/versions/assignments/event/key 全事务回滚；取消 trigger 后一次完整提交，同 key 重放无第二份副作用。
- 申请者与取消者分别验证：目标作者不能取消他人申请，requester 可取消；后续禁用 policy、改变 reviewer 当前资格/组、关闭真实文件连接后重开仍重放原 create/cancel 历史版本；新错误 payload/key 不伪装成功。
- DI04 真实两个 Node 进程在文件 WAL 库竞争：同 key 返回同对象且每类副作用恰一份；不同 key 争用同 target 得独立 round2/3、总计3请求/3事件/3key。各 child 自然 exit0、stderr0；finally 清退，不把单进程同步调用称 race。
- 真实 stored raw/hash/items/typedref 损坏安全409 RESYNC；F01 hash/ref自洽但冻结 reviewer 是 contributor、冻结 group重复/空白也拒。跨空间和撤权404优先；redacted材料410，private artifact隐藏，错误不带私有正文。
- public review.requested/cancelled 只投递匹配 target thread，不带正文/取消 reason/组；poll不自动ACK，未确认批次真实重投。

### M01 首反例及修复闭合

DI07 首次真实三变体全部 ordinary schema3 serve 重开失败：[原结果](DI07-first-observations.json)、DI07-first.log/.json。原因是启动迁移 compact review ref 使用线上材料重建，合法 target/dependency/artifact 脱敏触发 privacy拒绝；原 error code 未取到，仅记录 ERROR，不捏造 native code。

根裁 A v4/B v3 仅维护 void intrinsic 校验：严格原 raw SHA/header/items/ref/历史版本/冻结贡献者和组/same-space 绑定，无材料返回；线上 public helper 不能关闭 privacy，旧 operation family 路径保留。DI07 修后首次尝试在 Vitest 收集转换前 ENOSPC（DI07-fixed.log），case未启动，不计行为失败。根授权精确清理两已完成合成性能临时库后，DI07 单worker真实复验 **1/1 exit0/651ms**，三变体均 reopentrue、后续 hash/items/ref corruption均 refusedtrue；getSnapshot/getRequest/create重放仍410、撤权404、正常对象可读、维护前后compact原bytes不变。最终737套件重验同结论，见 [修复后](DI07-fixed-disk-retry-observations.json)、[最终完整套件观测](DI07-core-final-observations.json)。

## 真实旧维护与兼容

[独立维护脚本](maintenance-independent.mjs)、[安全回执](maintenance-independent-receipt.json)、maintenance-independent-third.log 是实际 Node 维护API及 built CLI；不把 mock/schema3 drop五表当 schema2，也不冒称独立旧部署认证。原 schema2 已build维护闭包67JS+3packageJSON在本包后补捕获且逐项匹配 fresh；第三方只复用现锁定安装，旧业务字节/用户 node_modules 不改。

真实 schema2 SQL+冻结原 API 生成 format1/schema2 physical backup；实际 built init/serve legacy2拒绝 exit3/FORBIDDEN；显式 migrate只新目标stage为3且源hash不变；old2backup恢复新stage3、原研究/附件保留、旧token拒绝。new3backup/restore保五张正式表所有冻结历史行（snapshot1/items3/request1/versions2/assignments2）。实际 old wire1/new wire2各仅导入研究，formal空、actor禁用、附件missing；重新签链的版本/source/excluded混配仍INVALID_INPUT。原第一次 ajv-formats冻结闭包绑定缺口、第二次 CLI expected exit2夹具错误（实际3/FORBIDDEN）均保原日志/源码，不归产品缺陷。

current29是最终四gate+先前本包实际25探针组合：**6原脚本+4既有获准adapter（#11/#27/#28/#29）+15本包schema3 adapter（#12–26）**。旧 probe原bytes不动，新adapter留originalSHA+精确diff；历史fixture排五新表、保old1/2反射、旧升级正例改显式ownedstage→currentserve，普通legacy init/serve拒绝由真实CLI对照。#12首路径夹具失败，首次日志路径误被第二次覆盖是D证据保存缺陷；完整首工具输出另存 current-12-path-failure-tool-output.txt及first receipt，不能称原首次文件仍在；随后固定唯一attempt路径。其余最终25皆0，不称无修改原脚本全通过。

## 实际差分与保护

审阅新 request-service、review-request-records、idempotency正式族、bootstrap M01两个分支、SQLite五表/事务与维护入口及协议records/futurecancelDTO。模块负责申请/取消资格、冻结构造与事务，core只窄metadata/compact重建，不反向依赖 module；current ACL refresh在事务/readSnapshot内，历史重放不重选当前reviewer；same-key/round实际由SQLite事务串行验证。取消 op复用DTO、expected_version不丢；F01和M01的边界分别是冻结内在约束与维护不返回材料，未增加在线skipprivacy开关。SQLite schema3为本包授权兼容变化：普通init/serve拒legacy1|2，offline迁移只publish newstage；五表历史不进入logical export，physical backup保留。

最终32个既有产品/config/test变动全部在A/B授权并集；7个授权新源/fixture（包括D1test）列在 functional-integrity-final.json，无越界已知变动。旧review **8398全部hash无变**；archive/README、pre-plan原bytes、historical-v1 SQL、旧Hasher、锁 ea84a370…、HEAD b8dacd…保持。historical-v2 SQL精确等于fresh旧schema.sql；schema.sql/schema.ts当前3允许变化，但 **V2/V1生成常量本身精确字节保持**（尾部classifier新增3选择属授权，不冒称整个旧tail无变）。dist含packages与modules，实际必要build变化明确记录，不作守恒声明。下层/当前新schema的保护不混淆“所有SQL不变”。

B三个旧test额外 standalone noEmit **exit2/9 diagnostics** 原文仍在 author/protocol/fixture-noemit.stdout.txt，provenance只证明相关表达式旧字节存在，不能证明之前编译也报同诊断，不能称 pre-existing或通过；正式 package type/lint与D新source noEmit0另列。当前 docs资源提示及新授权 docs11 before属于元数据范围，accepted入口等待根接受，不把 draft算正式。

## 资源与限制

单执行窗所有进程已自然终结；D匹配的独立fixture目录当前0，维护receipt cleanup_removedtrue。资源压力不宣称已解决；Colima/dsh/用户数据均不操作。根授权只删两个已完成合成临时目录，记录 [精确清理](two-perf-cleanup-receipt.json)，释放约1.765GiB、Data可用4814420KiB；永久原47MiB八JSONL与seed metadata/hash/失败/配方保留，唯一无秘密847B初始化补保留，其他tmp全部不动。没有为恢复测试重建seed或性能实验。

本包只真实已安装本机工具+短寿命 owned SQLite/子进程，不认证生产环境、VM、浏览器、模型研究、未来submission/sealing/reveal/status。下一任务规划不是已交付功能；不创建fresh、不提前封存，交根审读后再metadata末核。
