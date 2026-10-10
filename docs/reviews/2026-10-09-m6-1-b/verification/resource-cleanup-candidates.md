# 指定旧性能临时资源只读审计

2026-10-09T13:52:48+08:00。仅 `du -sk` 指定两个前缀、有限旧归档/配方、指定文件 hash/记录 PID 与 exact DB lsof；无测试、构建、全盘或用户 home 扫描，无删除、VM/Colima/dsh 操作。

| 精确路径 | du KiB | 已核归属/建议 |
|---|---:|---|
| /private/tmp/detuned-c2-load-auto-private-v3-a1 | 10748 | 自动门禁 smoke 私有运行库；旧 commands.json/automatic-command.json 对应 |
| /private/tmp/detuned-c2-load-auto-v3-a1 | 1060 | 自动门禁 smoke 公开输出；归档 automatic-smoke-v3 |
| /private/tmp/detuned-c2-load-fault-private-v3-a1 | 9324 | 首次 fault 私有运行库；fault-observer.mjs/experiment.json 对应 |
| /private/tmp/detuned-c2-load-fault-private-v3-a2 | 9324 | 第二次 fault 私有运行库；fault-observer-v2.mjs 对应 |
| /private/tmp/detuned-c2-load-fault-v3-a1 | 20 | 首次 fault 公开输出，原失败归档 |
| /private/tmp/detuned-c2-load-fault-v3-a2 | 24 | 第二次 fault 公开输出；cleanup-fault-final 归档 |
| /private/tmp/detuned-c2-load-full-private-v3-a1 | 941196 | 正式 full 私有运行库；旧 full-v3-command.json/run-prepare 命令精确对应；首选候选 |
| /private/tmp/detuned-c2-load-full-progress.json | 4 | 单独文件；本次未证明归档/生成归属，保留 |
| /private/tmp/detuned-c2-load-full-v3-a1 | 47920 | 正式 full 公开八份 JSONL，已逐项 SHA 匹配 repo full-v3；非首选、保留 |
| /private/tmp/detuned-c2-load-smoke-a1 | 16 | 首次 smoke 公开输出；commands.json 精确对应 |
| /private/tmp/detuned-c2-load-smoke-a2 | 944 | 第二次 smoke 公开输出；commands.json 精确对应 |
| /private/tmp/detuned-c2-load-smoke-private-a1 | 10316 | 首次 smoke 私有运行库；commands.json 精确对应 |
| /private/tmp/detuned-c2-load-smoke-private-v2-a1 | 10356 | v2 smoke 私有运行库；commands.json 精确对应 |
| /private/tmp/detuned-c2-load-smoke-v2-a1 | 992 | v2 smoke 公开输出；commands.json 精确对应 |
| /private/tmp/detuned-c2-seed-full-20261006-v3-a1 | 909584 | 正式 full 合成 seed；full-v3-first.command.json/seed README 精确对应；首选候选 |
| /private/tmp/detuned-c2-seed-read.txt | 40 | 单独文件；本次未证明归档/生成归属，保留 |
| /private/tmp/detuned-c2-seed-smoke-20261006-a1 | 9256 | 首 smoke seed；smoke-first.command.json 对应 |
| /private/tmp/detuned-c2-seed-smoke-20261006-v2-a1 | 9276 | 首 v2 seed；smoke-v2-first.command.json 对应 |
| /private/tmp/detuned-c2-seed-smoke-20261006-v2-a2 | 9276 | 末 v2 seed；smoke-v2-final.command.json 对应 |
| /private/tmp/detuned-c2-seed-smoke-20261006-v3-a1 | 9276 | v3 seed；smoke-v3-first.command.json 对应 |

## 两个首选候选

1. `/private/tmp/detuned-c2-load-full-private-v3-a1`，941196 KiB；顶层真实 `runtime.db` 963698688 B，其他顶层文件是该自有运行库的私有 runtime/live/初始化记录及旧门禁标志。生成输入/命令是已封存 M2.4-C.2 `implementation/load/commands.json`、`full-v3-command.json`。库是已完成测试生成的研究材料，不是用户论坛数据库；私有文件中有测试凭据，不得复制进仓库或日志。
2. `/private/tmp/detuned-c2-seed-full-20261006-v3-a1`，909584 KiB；`baseline.db` 931082240 B，100000 posts/997898 revisions/1000000 events 是批量合成配方输出，未冒称真实 HTTP 写入。精确生成命令与配方/版本在旧 `implementation/seed` 及 `scripts/scale/seed.mjs`、`tests/fixtures/scale/recipe.json`。

两者合计 1850780 KiB，约 1.765 GiB（du 分配块量；APFS 共享 extent 或快照可影响删除后实际可用空间，不承诺同量回收）。旧包原约定是默认保留，当前只列根可明确裁定的候选，未执行清理。

## 永久材料与必须保留

- 旧 M2.4-C.2 整包及全部旧 review 原字节不可改。当前 source 配方与旧封存 seed-v1/v2/recipe/command/stdout/stderr、小公开 manifest/oracle/discovery/generation 与独立完整账本/D01结果仍在 repo。
- full seed 四个小 JSON 与仓库 `implementation/seed/full-v3-{manifest,oracle,generation,discovery}.json` 已逐项 bytes/hash 匹配。不重新计算两个大数据库的 SHA，也不执行重建/性能验证。
- full public 目录八份原始文件 `consumer-ledger.jsonl`、`operations.jsonl`、`requests.jsonl`、`resources.jsonl`、`run-config.jsonl`、`server-log.jsonl`、`summary.jsonl`、`write-ledger.jsonl` 与仓库 `implementation/load/full-v3` 逐项 SHA 匹配（合计约47 MiB）；原失败、600秒窗口原始证据在仓库，必须保留。当前建议暂保公共 tmp 输出，避免不必要扩大清理。
- 两个单独文件 `detuned-c2-load-full-progress.json`、`detuned-c2-seed-read.txt` 尚未证明精确归属/归档，保留。其他小目录仅完成归属交叉确认，不作为这次首选删除范围。
- Colima owned root、dsh 保留资源、用户数据与任何非明确候选路径全部不触碰。

## 当前依赖与进程界限

只读检查 `live.json`/`restarted-live.json` 的 `server_pid` 字段；41380、41780、41928、39575、40848、37433、37556 均当前不存在（仅零信号存活查询，无终止）。精确 `lsof -t --` 查询两个大 DB，以及 auto/fault/smoke 的五个 runtime.db 与四个小 seed baseline.db，exit1/空输出，无列出的打开持有者；没有扫描或输出全局进程参数。这是该有限文件/PID集合的观察，不声称全系统不存在其它进程。

packages/modules/scripts/tests 中未发现硬编码这两个临时前缀的 source 依赖；旧封存账本/恢复核验脚本仍记录它们作为已完成实验输入。移除大库意味着今后不能立即针对同一旧库重复审计，需要沿已保存配方重建；本次 M6.1-B 验收不依赖这些库。不得把清理说成所有历史 runtime 研究材料已完整再认证。

ENOSPC 日志中的唯一已知 Vitest transform cache `/private/var/folders/s0/zq7fp6pj2z74h4xx81jwqnkw0000gn/T/D2rmfkiCnPNbEGjaeCrrp` 现在不存在。未扩展扫描 T 目录，未清理其它缓存。

## 根授权删除前最后证据核对

2026-10-09：根已明确授权仅删除上述两个 full 私有/合成 seed 目录。原配方、旧 review、公共 tmp 输出及其余目录继续保留。唯一补保留的 847 B 初始化记录已核精确白名单字段（无 token/secret/正文），保存到 `two-perf-cleanup-preserved-initialization.json`，SHA256 `4bd1cf683aa4a1010377941df1248879dc1f70a9c73fcb9f58359e07d3cb9d92`；不复制 runtime/live 凭据文件或数据库。

真实永久 postflight 输出为旧包 `verification/observed-full-postflight-first-2026-10-06.txt`、`observed-full-postflight-resume-first-2026-10-06.txt`、`observed-full-postflight-resume-second-2026-10-06.txt` 及各自 `.stderr.txt`；这些实际文件均存在。完整账本 `full-ledger-v2.json`、`full-preflight-first.json`、`full-seed-independent-first.json`、`d01-independent.json` 也存在；没有将不存在的 postflight JSON 写成保留证据。
