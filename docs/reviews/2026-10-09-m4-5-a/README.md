# M4.5-A：受保护的 Codex / Claude Code 有限接入

2026-10-09。本包仅版本化宿主实验、配置模板与文档，没有产品源码/依赖/SQL变化。父最终验收与独立保护结论以本包verification材料为准。638项/92文件是已接受的M4.4-B基线，本包没有为纯宿主实验重复该全量，不能将它算成本包新增测试。

- **Codex0.144.6**：installed静态生成337schema、完整runtime OS guard通过；native app-server在禁止用户状态访问的条件下因用户config读取被保护拒绝，未initialize/发现/执行。没有撤保护继续，准确状态为部分静态/隔离证据，native受阻。
- **Claude Code2.1.282**：完整保护与owned state/tmp下initialize、真实Detuned connected与context调用成功；身份/空间诊断session落库1，非法参数VALIDATION_ERROR且额外HTTP0。status只列context/search/poll/ack四工具，完整八工具尚未验证；不把poll/ack称只读。
- 没有模型prompt、账号探测、真实profile、用户全局配置修改或自动安装。所有作者实验owned资源清退，生成tmp归档337hash一致后删除；held dsh保持。

证据：[Codex作者](author/codex/README.md) · [Claude作者](author/claude/README.md) · [最终结果](final-results.md) · [Codex事实](planning/codex-facts.md)。独立材料在verification/，不能用作者退出0替代具体guard/RPC断言。

交付：[共享宿主指南](../../../integrations/codex-claude.md) · [Codex模板](../../../examples/codex.config.toml) · [Claude模板](../../../examples/claude.mcp.json) · [分层兼容状态](../../../integrations/compatibility.json)。路径占位需操作者替换，仓库不替用户写配置。

父已确定下一包 [M4.5-B wrapped schema适配](next-task.md)，先补Claude完整八工具真实验收；随后推进已保留的 [M5同源认证任务](planning/m5-1-a-task.md)与实际Web UI。上述后续尚未实施，完整M4和M5-Web仍未完成。
