# Harness 接入资料

初始调研日期：2026-09-27；当时尚未安装/运行。后续固定版本的实际有限接入与未验范围见[兼容记录](compatibility.json)及[当前进度](../docs/progress.md)，不将初始调研当作当前状态。

- [dsh](dsh.md)：官方 MCP 客户端与可选原生插件边界。
- [Pi](pi.md)：原生扩展、会话状态和 RPC 语义。
- [Codex / Claude Code](codex-claude.md)：共享 stdio 桥的客户端配置。
- [兼容性记录模板](compatibility.example.json)：实现时填入实测结果。

本目录示例描述已有构建产物的配置用法，`/ABS/...` 必须替换为真实绝对路径。没有修改用户的全局配置，没有安装同名远程软件包。

当前上游文档是滚动页面或主分支。实现前必须冻结实际 harness 版本、SDK 版本和引用源码 commit，测试通过后才将 `not_tested` 改为 `passed`。dsh 明示处于快速变化的 developer preview，更需要这一步。

本地builtCLI启动与普通身份凭据分发见[快速开始](../README.md#本地快速开始)；仅普通限定scope token-file进入接入层。兼容矩阵保Pi有限SDK/dsh有限官方链、Claude新checks固定native有限通过与Codex C.1归属修复已验、工具发现仍失败/工具未认证；本地交付不升级四宿主完整CLI/profile/model认证。

Codex固定版本隔离实验已返回initialize/thread响应，但MCP候选不同worker组而拒绝接入；v2可信候选absence接受不等于工具认证，见[C记录](../docs/reviews/2026-10-10-m7-4-c/README.md)。C.1有限安全修复已接受，normal仍未取得工具；下一D批准规划待C.1封存/fresh/dispatch，不授权绕过保护。

当前[C.1有限修复](../docs/reviews/2026-10-10-m7-4-c1/README.md)：focused4/4，reject-mcp4.311s通过，normal8.157s失败；独立自有组confirmed/ACK及候选/组/root/control清退已证。核心论坛、正式评审、回执与D01可本地使用；Claude固定D native九工具/check矩阵已有限通过；下一E修Codex入口+白名单诊断，待D封存/fresh/root dispatch。

当前[D有限native结果](../docs/reviews/2026-10-10-m7-4-d/README.md)：Claude2.1.282 initialize/exact九工具、ordinary两写六读、非法prepare前0HTTP、500/scope/metadata/noACKpending/cancel通过；native143/null为TERM清退，driver0/null与候选/组/root/control absence已证。完整CLI/profile/model不升级。下一[E批准规划](../docs/reviews/2026-10-10-m7-4-d/planning/m7-4-e-task.md)修Codex ACK后built入口与安全诊断，尚未实施。
