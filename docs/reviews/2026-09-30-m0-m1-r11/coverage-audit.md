# R11 交付声明与覆盖核对

依据当前源码、R10 next-agent-prompt、实现者交付 README/commands/logs 与本次独立执行。实现产物目录为 [implementation-r4-b4-2r](../2026-09-29-m0-m1-r10/implementation-r4-b4-2r/README.md)。

## 有效修复与未完成条件

| 要求 | 本轮实际落实 | 未完成或说明过度之处 |
|---|---|---|
| 11 族穷尽类型与共同流程 | 解析 operation 已存在；typed 最终 validator、语义 helper、历史投影复用；新 action 提交前调用语义 helper | family 仍 string，result/ref 的 any 未收口；在线和迁移各自解码 legacy；storage 额外复制预检；Q01/Q02/Q04 失败 |
| P01 嵌套绑定 | 传入所属 post/revision，验证 target revision、版本上界和 resolution 历史 | 已确认修复，不要求重做；正式 P01 主要是错误 source post、未来版本两个例子，不能宣称矩阵每个变体均已独立执行 |
| P02 原输入校验 | body、重复 ID、known op/wrong kind、版本 0、错误 thread target 这五个例子拒绝并回滚 | Q01 的必填/成对/已知实体矛盾仍先降级；Q02 legacy 明确坏值仍默认化 |
| P03 旧在线投影 | 正确绑定 Post 所属 Thread；读取历史快照的 updated_at；P03 通过 | 最终投影统一不等于输入识别、验证、规范化统一 |
| P04 时间 | 两个时间都缺失时原子拒绝；不再写审查时刻 | 只缺 updated_at 时仍取 Thread.created_at，Q03 错误成功 |
| P05 新编码 | 非法关系状态、字符串版本、非法 nested state 拒绝 | Q04 非数组 relations 和损坏 initial_post 被丢弃；真实 action 返回异常结构时仍提交 |
| 正常流程/事务保护 | P06、J07、N01–N05 通过；Q05 配对合法新写、旧结果、历史嵌套、resolved v2 复用及语义失败回滚 | 不扩大为所有 11 族完整 round-trip 已验收；原 B01 汇总仍归 B.4-3 |

## 正式测试核对

- L05（1841 行）和 L07（1926 行）已实际调用全库 snapshot，关闭重开后比较，包括 sqlite_master 和所有表行。此项通过。
- L06（1865 行）两个错误引用现在均有真实 Fastify inject 重放，验证 422/RESYNC_REQUIRED。此项通过。
- L02-3c（1680 行）未完成全库比较，1699/1704 行仍仅查 idempotency_records。unknown_reason、extra_body 的 marker.op 为 relation.create，所属记录却是 thread.patch:target_thread，且 scope/实体也不是合法基准。它们可被更早的 op 不匹配挡住，无法证明只坏 reason/body 的拒绝。
- 新增 P01–P05 五个正式测试，48 项 B 回归与 112 项总测试属实。P05 只有纯编码器断言，没有 R10 要求的 action 写入后非法结果导致三类写入整体回滚；Q04/Q05 补验表明，语义错误会回滚，形状被丢弃时不会。下一包将这些反例纳入正式矩阵。
- 有效旧响应故障、N 标记重启、迁移 SQL 故障、合法旧 DDL 证据继续复用，不要求机械复制。没有重新展开 B.4-3 全矩阵审计。

## 归档核对

机器可读结果见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。

- 27 条命令均有 stdout/stderr 文件；before 产品指纹与 R10 输入相同，after 83 个产品/测试指纹与本轮输入相同。认可这个改进。
- commands 没有 R1–R3 命令；其中 13、15 是调用不存在脚本的真实失败，后来换对路径重跑，日志如实保留。不能把第 13 条称为成功 R3 结果。
- README 表里的 `logs/10-pnpm-test-all.stdout.txt`、`logs/11-typecheck.stdout.txt`、`logs/13-probe-r3.stdout.txt` 不存在。实际前两项分别为 `logs/11-test-all.stdout.txt`、`logs/10-typecheck.stdout.txt`（后续另有 `logs/26-final-typecheck.stdout.txt`）。
- R11 独立执行 R1–R3 并确认 46 项通过；可作为新验证来源明确引用，不能伪造过去运行记录。
- 根入口未指向这次独立结论；本次审查已更新 README、progress 与审查索引，历史自报加注解，保留原证据。

## 准确的后续边界

- B.4-2R2：两个已布置根因与本页证据补项。
- B.4-3：R8-F05/L03、结构分类和预检、可执行 DDL 单一来源、原 B01–B12 尚缺条件；详见 [原拆分](../2026-09-29-m0-m1-r8/remaining-work.md)。
- R4-C：U05 非法枚举及原契约包、U06 截断 JSON/取消链。U05 不要再改写成跨空间关系测试。
- M2.1、真实 harness、Web、正式评审均不进入这次收尾。未使用或启用 deepseek-brainstorm，未启动其他 Agent。
