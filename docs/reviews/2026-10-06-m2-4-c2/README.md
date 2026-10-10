# M2.4-C.2：规模与完整上下文链路

2026-10-06父接受。M2 共享记忆功能与本机工程验收完成，T06 与 D01 步骤1–3闭合；334/334正式测试、36文件，唯一 fullsuite 与 build/typecheck/lint 通过。本轮旧 current29 与旧13探针未重跑，不登记为当轮通过。

唯一正式窗口600001.568ms：24000 logical、34782 HTTP = 33572成功 + 943宽泛查询422 + 267预期409，0意外错误；20客户端各确认4533 events，最终高水位1004752。普通成功p95 41.580ms，真实短词成功p95 36.947ms（1908成功 + 943限额拒绝），拒绝不计成功延迟分母。

原正式runner整体exit1/complete=false：后验启动过晚，未能在120秒门禁内完成，原日志保留。后来同一DB的独立postflight/control、事件账本与D01结果通过；未重跑600秒或改写测量结果。自动wrapper另有唯一v3 tiny实测：10s窗口10000.667ms、400 logical、591HTTP（586成功+5预期409）、0意外；pre/post固定verifier各exit0后原子放ok，wrapper exit0。tiny不是第二次正式规模窗口。

来源：[full独立账本](verification/full-ledger-v2.json)、[D01独验](verification/d01-independent.json)、[自动门禁tiny原档](implementation/load/automatic-smoke-v3/automatic-gates.json)、[覆盖](coverage-audit.md)、[实现入口](implementation/README.md)。资源值必须按原记录window/process范围解读，不混用不同peak。正式基线100000Post/997898revision/1000000Event，seed约888MiB，独立固定hash/FTS/因果/seq核通过。

实际10CPU/16GiB主机，不是受控2CPU/4GiB/SSD认证；未运行真实模型、四宿主完整认证，M3–M8未完成。 产品核心源码未改；新D01/wrapper晚于334套件，其执行和审查单列。完整历史证据保留，状态同步不冒称运行期零变化。下一包：[已批准M3.1](next-task.md)。

自动wrapper清理候选经自有SIGSTOP→取消→5秒KILL故障复验闭合，首失败保留；见[窄审追加结论](implementation/seed/cross-review-verify.md#自动wrapper追加窄审与清理候选关闭2026-10-06)与[清理证据](implementation/load/cleanup-report.md)。
