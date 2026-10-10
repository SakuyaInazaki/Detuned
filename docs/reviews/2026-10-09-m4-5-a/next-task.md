# 下一任务：M4.5-B MCP 广告 schema 宿主适配

父已确定先完成 Claude 原生完整八工具，再立即进入 M5 同源认证与实际 Web UI。当前 M4.5-A 有限验收结论以本包 [README](README.md) 和独立 verification 为准；Codex 最新保护边界是官方 owned SQLite/log override 后，用户 config 读取仍被 OS 拒绝，未 initialize。原三轮证据保留。

M4.5-B 精确范围与开工冻结见 B 的 [任务书](planning/m4-5-b-task.md)：显式 MCP flat|wrapped 完整 canonical 嵌套适配，保留服务端唯一规则，优先验证 Claude 真实八工具。fresh baseline 后才实施；本包不预填通过结果。

已冻结的 M5.1-A 同源认证与 sharedclient 完整任务保存在 [后续任务书](planning/m5-1-a-task.md)，不得丢失或将其规划能力标成已实现。M5.1-B 随后交付真实 React/Vite 用户旅程。
