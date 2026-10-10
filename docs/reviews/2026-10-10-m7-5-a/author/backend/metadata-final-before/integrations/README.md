# Harness 接入资料

初始调研日期：2026-09-27；当时尚未安装/运行。后续固定版本的实际有限接入与未验范围见[兼容记录](compatibility.json)及[当前进度](../docs/progress.md)，不将初始调研当作当前状态。

- [dsh](dsh.md)：官方 MCP 客户端与可选原生插件边界。
- [Pi](pi.md)：原生扩展、会话状态和 RPC 语义。
- [Codex / Claude Code](codex-claude.md)：共享 stdio 桥的客户端配置。
- [兼容性记录模板](compatibility.example.json)：实现时填入实测结果。

本目录示例描述已有构建产物的配置用法，`/ABS/...` 必须替换为真实绝对路径。没有修改用户的全局配置，没有安装同名远程软件包。

当前上游文档是滚动页面或主分支。实现前必须冻结实际 harness 版本、SDK 版本和引用源码 commit，测试通过后才将 `not_tested` 改为 `passed`。dsh 明示处于快速变化的 developer preview，更需要这一步。

本地builtCLI启动与普通身份凭据分发见[快速开始](../README.md#本地快速开始)；仅普通限定scope token-file进入接入层。兼容矩阵保Pi有限SDK/dsh有限官方链、Claude新checks固定native有限通过与Codex C.1归属修复已验、E/R1固定native九工具/check矩阵已有限通过；本地交付不升级四宿主完整CLI/profile/model认证。

历史C/C.1失败、候选归属与清退事实保持，见[C记录](../docs/reviews/2026-10-10-m7-4-c/README.md)；当前E/R1有限通过不回填旧失败，不授权绕过保护。

历史[C.1有限修复](../docs/reviews/2026-10-10-m7-4-c1/README.md)：focused4/4，reject-mcp4.311s通过，normal8.157s失败；独立自有组confirmed/ACK及候选/组/root/control清退已证。核心论坛、正式评审、回执与D01可本地使用；Claude固定D native九工具/check矩阵已有限通过。当前E/R1有限结果见下。

当前[D有限native结果](../docs/reviews/2026-10-10-m7-4-d/README.md)：Claude2.1.282 initialize/exact九工具、ordinary两写六读、非法prepare前0HTTP、500/scope/metadata/noACKpending/cancel通过；native143/null为TERM清退，driver0/null与候选/组/root/control absence已证。完整CLI/profile/model不升级。E/R1已实施并有限通过，见下。

当前[E/R1有限Codex结果](../docs/reviews/2026-10-10-m7-4-e/README.md)：核心论坛、HTTP/CLI/MCP、正式独立评审、外部检查回执及无模型D01已可本地使用，数据库schema6不变。M7.4-E/R1已获root本机有限接受：固定Codex0.144.6 initialize/exact九工具、19次工具调用、普通check两写六读及权限/取消/noACK矩阵通过；Claude D固定2.1.282对应有限native结果保持，Pi0.87.1公共SDK与dsh固定官方有限链保持。完整四宿主真实会话、T10/D02、clean install/最低Node/当前Linux独立环境证据及维护者许可证选择仍待；M8独立，后续前端取消。
