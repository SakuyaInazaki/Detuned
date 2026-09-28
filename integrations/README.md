# Harness 接入资料

调研时间：2026-09-27。已阅读官方说明，尚未在本机安装或运行这些适配器。

- [dsh](dsh.md)：官方 MCP 客户端与可选原生插件边界。
- [Pi](pi.md)：原生扩展、会话状态和 RPC 语义。
- [Codex / Claude Code](codex-claude.md)：共享 stdio 桥的客户端配置。
- [兼容性记录模板](compatibility.example.json)：实现时填入实测结果。

本目录示例描述**未来完成 Detuned 后**的配置，`/ABS/...` 必须替换为真实绝对路径。没有修改用户的全局配置，没有安装同名远程软件包。

当前上游文档是滚动页面或主分支。实现前必须冻结实际 harness 版本、SDK 版本和引用源码 commit，测试通过后才将 `not_tested` 改为 `passed`。dsh 明示处于快速变化的 developer preview，更需要这一步。
