# Harness 接入资料

初始调研日期：2026-09-27；当时尚未安装/运行。后续固定版本的实际有限接入与未验范围见[兼容记录](compatibility.json)及[当前进度](../docs/progress.md)，不将初始调研当作当前状态。

- [dsh](dsh.md)：官方 MCP 客户端与可选原生插件边界。
- [Pi](pi.md)：原生扩展、会话状态和 RPC 语义。
- [Codex / Claude Code](codex-claude.md)：共享 stdio 桥的客户端配置。
- [兼容性记录模板](compatibility.example.json)：实现时填入实测结果。

本目录示例描述已有构建产物的配置用法，`/ABS/...` 必须替换为真实绝对路径。没有修改用户的全局配置，没有安装同名远程软件包。

当前上游文档是滚动页面或主分支。实现前必须冻结实际 harness 版本、SDK 版本和引用源码 commit，测试通过后才将 `not_tested` 改为 `passed`。dsh 明示处于快速变化的 developer preview，更需要这一步。
