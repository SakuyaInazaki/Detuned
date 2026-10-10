# C2实现交付入口

本轮只新增scale工具与新HTTP端到端回归，产品核心源码/SQL/DDL未改。

- [seed冻结与资源/因果自验](seed/README.md)：v1/v2预检保留，v3最终配方100k/1M；凭据不归档。
- [load工具与测量](load/README.md)：逻辑/HTTP真实分母，固定参数正式窗口。
- [D01演示](d01/README.md)：三普通身份与独立C查询→固定ref→正确proposal；实际结果见[独验](../verification/d01-independent.json)。
- [自动门禁tiny](load/automatic-smoke-v3/automatic-gates.json)：原测量4脚本不改，新wrapper固定可信入口。

原正式runner整体exit1/complete=false：后验启动过晚，未能在120秒门禁内完成，原日志保留。后来同一DB的独立postflight/control、事件账本与D01结果通过；未重跑600秒或改写测量结果。自动wrapper另有唯一v3 tiny实测：10s窗口10000.667ms、400 logical、591HTTP（586成功+5预期409）、0意外；pre/post固定verifier各exit0后原子放ok，wrapper exit0。tiny不是第二次正式规模窗口。

M2 共享记忆功能与本机工程验收完成，T06 与 D01 步骤1–3闭合；334/334正式测试、36文件，唯一 fullsuite 与 build/typecheck/lint 通过。本轮旧 current29 与旧13探针未重跑，不登记为当轮通过。 实际10CPU/16GiB主机，不是受控2CPU/4GiB/SSD认证；未运行真实模型、四宿主完整认证，M3–M8未完成。 下一包[M3.1](../next-task.md)。
